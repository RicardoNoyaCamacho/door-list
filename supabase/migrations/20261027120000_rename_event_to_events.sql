begin;

alter table public.event rename to events;

-- PostgreSQL preserves foreign keys, grants, RLS and parsed policy expressions
-- by relation OID. Rename only object names derived from the former table name;
-- event_id remains the name of the relationship column.
do $$
declare
  item record;
begin
  for item in select conname from pg_catalog.pg_constraint
    where conrelid = 'public.events'::regclass and conname like 'event\_%' escape '\'
  loop
    execute format('alter table public.events rename constraint %I to %I',
      item.conname, 'events_' || substr(item.conname, 7));
  end loop;
  for item in select indexname from pg_catalog.pg_indexes
    where schemaname = 'public' and tablename = 'events' and indexname like 'event\_%' escape '\'
  loop
    execute format('alter index public.%I rename to %I',
      item.indexname, 'events_' || substr(item.indexname, 7));
  end loop;
end;
$$;

alter table public.events enable row level security;

create or replace function public.enforce_ticket_capacity_within_event_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  affected_event_ids uuid[];
begin
  if tg_table_name = 'events' then
    affected_event_ids := array[new.id];
  elsif tg_op = 'DELETE' then
    affected_event_ids := array[old.event_id];
  elsif tg_op = 'INSERT' then
    affected_event_ids := array[new.event_id];
  else
    affected_event_ids := array[old.event_id, new.event_id];
  end if;

  if exists (
    select 1
    from public.events as e
    where e.id = any(affected_event_ids)
      and (
        select coalesce(sum(tt.capacity), 0)
        from public.ticket_types as tt
        where tt.event_id = e.id
      ) > e.capacity
  ) then
    raise exception 'The combined ticket capacity cannot exceed the event capacity';
  end if;

  return null;
end;
$$;

create or replace function public.enforce_published_event_has_ticket_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_ids uuid[];
begin
  if tg_table_name = 'events' then
    event_ids := array[new.id];
  elsif tg_op = 'INSERT' then
    event_ids := array[new.event_id];
  elsif tg_op = 'DELETE' then
    event_ids := array[old.event_id];
  else
    event_ids := array[old.event_id, new.event_id];
  end if;

  if exists (
    select 1
    from public.events as e
    where e.id = any(event_ids)
      and e.status = 'published'
      and not exists (
        select 1
        from public.ticket_types as tt
        where tt.event_id = e.id
      )
  ) then
    raise exception 'A published event must have at least one ticket type';
  end if;

  return null;
end;
$$;

create or replace function public.guard_registered_ticket_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.events where id = new.event_id for update;
  elsif tg_op = 'DELETE' then
    perform 1 from public.events where id = old.event_id for update;
  else
    perform 1 from public.events where id in (old.event_id, new.event_id) order by id for update;
    if new.capacity < (select count(*) from public.registrations where ticket_type_id = old.id) then
      raise exception 'El aforo de la entrada no puede ser menor que sus registros.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.get_public_registration_event(p_event_id uuid)
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
  from public.events e
  where e.id = p_event_id and e.status = 'published'
    and (e.starts_at at time zone 'America/Mexico_City')::date >=
        (statement_timestamp() at time zone 'America/Mexico_City')::date;
$$;

create or replace function public.register_event_attendee(
  p_event_id uuid, p_ticket_type_id uuid, p_name text, p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.events%rowtype;
  selected_ticket_type public.ticket_types%rowtype;
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

  select * into selected_event from public.events where id = p_event_id for update;
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
  select * into selected_ticket_type from public.ticket_types
  where id = p_ticket_type_id and event_id = p_event_id;
  if not found then
    return jsonb_build_object('code', 'ticket_unavailable');
  end if;
  if (selected_event.starts_at at time zone 'America/Mexico_City')::date <
     (clock_timestamp() at time zone 'America/Mexico_City')::date then
    return jsonb_build_object('code', 'event_unavailable');
  end if;
  if (select count(*) from public.registrations where ticket_type_id = p_ticket_type_id) >= selected_ticket_type.capacity
     or (select count(*) from public.registrations where event_id = p_event_id) >= selected_event.capacity then
    return jsonb_build_object('code', 'ticket_unavailable');
  end if;

  insert into public.registrations (event_id, ticket_type_id, name, email)
  values (p_event_id, p_ticket_type_id, attendee_name, attendee_email)
  returning id into new_registration_id;
  select code into strict entry_code from public.tickets where registration_id = new_registration_id;
  return jsonb_build_object(
    'code', 'success', 'event_title', selected_event.title,
    'ticket_type_name', selected_ticket_type.name, 'ticket_code', entry_code
  );
end;
$$;

create or replace function public.get_public_ticket(p_code text)
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
  join public.events e on e.id = r.event_id
  join public.ticket_types tt on tt.id = r.ticket_type_id and tt.event_id = r.event_id
  where p_code ~ '^[0-9a-f]{64}$' and t.code = p_code;
$$;

commit;
