create unique index ticket_types_id_event_id_key on public.ticket_types (id, event_id);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event (id) on delete restrict,
  ticket_type_id uuid not null,
  name text not null check (char_length(name) between 1 and 200 and name ~ '[^[:space:]]'),
  email text not null check (
    char_length(email) <= 254 and email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  created_at timestamptz not null default now(),
  constraint registrations_ticket_event_fk foreign key (ticket_type_id, event_id)
    references public.ticket_types (id, event_id) on delete restrict on update restrict,
  constraint registrations_event_email_key unique (event_id, email)
);

create index registrations_ticket_type_id_idx on public.registrations (ticket_type_id);
alter table public.registrations enable row level security;
revoke all on public.registrations from public, anon, authenticated;

-- Every ticket mutation shares the parent lock used by registration. Volatile
-- trigger queries see committed registrations after waiting for that lock.
create function public.guard_registered_ticket_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.event where id = new.event_id for update;
  elsif tg_op = 'DELETE' then
    perform 1 from public.event where id = old.event_id for update;
  else
    perform 1 from public.event where id in (old.event_id, new.event_id) order by id for update;
    if new.capacity < (select count(*) from public.registrations where ticket_type_id = old.id) then
      raise exception 'El aforo de la entrada no puede ser menor que sus registros.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.guard_registered_ticket_capacity() from public, anon, authenticated;
create trigger guard_registered_ticket_capacity
before insert or update or delete on public.ticket_types
for each row execute function public.guard_registered_ticket_capacity();

create function public.guard_registered_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.capacity < (select count(*) from public.registrations where event_id = old.id) then
    raise exception 'El aforo del evento no puede ser menor que sus registros.';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_registered_event_capacity() from public, anon, authenticated;
create trigger guard_registered_event_capacity
before update of capacity on public.event
for each row execute function public.guard_registered_event_capacity();

-- Only public event information and aggregate availability leave the database.
create function public.get_public_registration_event(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description,
    'venue', e.venue, 'starts_at', e.starts_at,
    'ticket_types', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name,
        'remaining', greatest(0, least(
          t.capacity - (select count(*) from public.registrations r where r.ticket_type_id = t.id),
          e.capacity - (select count(*) from public.registrations r where r.event_id = e.id)
        ))
      ) order by t.created_at, t.id)
      from public.ticket_types t where t.event_id = e.id
    ), '[]'::jsonb)
  )
  from public.event e
  where e.id = p_event_id and e.status = 'published'
    and (e.starts_at at time zone 'America/Mexico_City')::date >=
        (statement_timestamp() at time zone 'America/Mexico_City')::date;
$$;

create function public.register_event_attendee(
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
begin
  if p_event_id is null or p_ticket_type_id is null
     or attendee_name is null or char_length(attendee_name) not between 1 and 200
     or attendee_name !~ '[^[:space:]]'
     or attendee_email is null or char_length(attendee_email) > 254
     or attendee_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    return jsonb_build_object('code', 'invalid_input');
  end if;

  -- Serialize all registrations for an event, including different ticket types.
  select * into selected_event from public.event where id = p_event_id for update;
  if not found or selected_event.status <> 'published'
     or (selected_event.starts_at at time zone 'America/Mexico_City')::date <
        (clock_timestamp() at time zone 'America/Mexico_City')::date then
    return jsonb_build_object('code', 'event_unavailable');
  end if;

  if exists (select 1 from public.registrations where event_id = p_event_id and email = attendee_email) then
    return jsonb_build_object('code', 'duplicate');
  end if;

  select * into selected_ticket from public.ticket_types
  where id = p_ticket_type_id and event_id = p_event_id for update;
  if not found then
    return jsonb_build_object('code', 'ticket_unavailable');
  end if;
  -- A lock wait can cross local midnight; check the clock again before insert.
  if (selected_event.starts_at at time zone 'America/Mexico_City')::date <
     (clock_timestamp() at time zone 'America/Mexico_City')::date then
    return jsonb_build_object('code', 'event_unavailable');
  end if;
  if (select count(*) from public.registrations where ticket_type_id = p_ticket_type_id) >= selected_ticket.capacity
     or (select count(*) from public.registrations where event_id = p_event_id) >= selected_event.capacity then
    return jsonb_build_object('code', 'ticket_unavailable');
  end if;

  insert into public.registrations (event_id, ticket_type_id, name, email)
  values (p_event_id, p_ticket_type_id, attendee_name, attendee_email);
  return jsonb_build_object('code', 'success', 'event_title', selected_event.title, 'ticket_name', selected_ticket.name);
end;
$$;

revoke all on function public.get_public_registration_event(uuid) from public, anon, authenticated;
revoke all on function public.register_event_attendee(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_public_registration_event(uuid) to anon, authenticated;
grant execute on function public.register_event_attendee(uuid, uuid, text, text) to anon, authenticated;
