create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Resolve the extension's actual schema, including existing installations where
-- pgcrypto lives outside "extensions". No caller-controlled SQL is interpolated.
create function public.generate_entry_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  crypto_schema name;
  entry_code text;
begin
  select n.nspname into strict crypto_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';
  execute pg_catalog.format('select pg_catalog.encode(%I.gen_random_bytes(32), ''hex'')', crypto_schema)
    into entry_code;
  return entry_code;
end;
$$;

revoke all on function public.generate_entry_code() from public, anon, authenticated;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations (id) on delete restrict,
  code text not null default public.generate_entry_code() unique check (code ~ '^[0-9a-f]{64}$'),
  status text not null default 'valid' check (status in ('valid', 'used', 'revoke')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tickets enable row level security;
revoke all on public.tickets from public, anon, authenticated;

create trigger set_ticket_updated_at
before update on public.tickets
for each row execute function public.set_event_management_updated_at();

create function public.protect_ticket_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.registration_id is distinct from old.registration_id
     or new.code is distinct from old.code then
    raise exception 'No se puede cambiar la identidad de una entrada emitida.';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_ticket_identity() from public, anon, authenticated;
create trigger protect_ticket_identity
before update on public.tickets
for each row execute function public.protect_ticket_identity();

-- An issuance failure rolls back the registration and leaves its place free.
create function public.issue_registration_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tickets (registration_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.issue_registration_ticket() from public, anon, authenticated;
create trigger issue_registration_ticket
after insert on public.registrations
for each row execute function public.issue_registration_ticket();

-- Existing confirmed registrations also receive exactly one entry.
insert into public.tickets (registration_id) select id from public.registrations;

create or replace function public.register_event_attendee(
  p_event_id uuid, p_ticket_type_id uuid, p_name text, p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.event%rowtype;
  selected_ticket public.ticket_types%rowtype;
  attendee_name text := btrim(p_name);
  attendee_email text := lower(btrim(p_email));
  new_registration_id uuid;
  entry_code text;
begin
  if p_event_id is null or p_ticket_type_id is null
     or attendee_name is null or char_length(attendee_name) not between 1 and 200
     or attendee_name !~ '[^[:space:]]'
     or attendee_email is null or char_length(attendee_email) > 254
     or attendee_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    return jsonb_build_object('code', 'invalid_input');
  end if;

  select * into selected_event from public.event where id = p_event_id for update;
  if not found or selected_event.status <> 'published'
     or (selected_event.starts_at at time zone 'America/Mexico_City')::date <
        (clock_timestamp() at time zone 'America/Mexico_City')::date then
    return jsonb_build_object('code', 'event_unavailable');
  end if;

  -- Knowing an email must never disclose the bearer code of an existing entry.
  if exists (select 1 from public.registrations where event_id = p_event_id and email = attendee_email) then
    return jsonb_build_object('code', 'duplicate');
  end if;

  -- Ticket writers share the event lock. A second FOR UPDATE here would invert
  -- lock order against a capacity update already waiting in its BEFORE trigger.
  select * into selected_ticket from public.ticket_types
  where id = p_ticket_type_id and event_id = p_event_id;
  if not found then
    return jsonb_build_object('code', 'ticket_unavailable');
  end if;
  if (selected_event.starts_at at time zone 'America/Mexico_City')::date <
     (clock_timestamp() at time zone 'America/Mexico_City')::date then
    return jsonb_build_object('code', 'event_unavailable');
  end if;
  if (select count(*) from public.registrations where ticket_type_id = p_ticket_type_id) >= selected_ticket.capacity
     or (select count(*) from public.registrations where event_id = p_event_id) >= selected_event.capacity then
    return jsonb_build_object('code', 'ticket_unavailable');
  end if;

  insert into public.registrations (event_id, ticket_type_id, name, email)
  values (p_event_id, p_ticket_type_id, attendee_name, attendee_email)
  returning id into new_registration_id;
  select code into strict entry_code from public.tickets where registration_id = new_registration_id;
  return jsonb_build_object(
    'code', 'success', 'event_title', selected_event.title,
    'ticket_name', selected_ticket.name, 'ticket_code', entry_code
  );
end;
$$;

create function public.get_public_ticket(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', t.code, 'status', t.status, 'issued_at', t.created_at,
    'attendee', jsonb_build_object('name', r.name, 'email', r.email),
    'event', jsonb_build_object('title', e.title, 'venue', e.venue, 'starts_at', e.starts_at),
    'ticket_type', jsonb_build_object('name', tt.name)
  )
  from public.tickets t
  join public.registrations r on r.id = t.registration_id
  join public.event e on e.id = r.event_id
  join public.ticket_types tt on tt.id = r.ticket_type_id and tt.event_id = r.event_id
  where p_code ~ '^[0-9a-f]{64}$' and t.code = p_code;
$$;

revoke all on function public.register_event_attendee(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_public_ticket(text) from public, anon, authenticated;
grant execute on function public.register_event_attendee(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.get_public_ticket(text) to anon, authenticated;
