create table public.event (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  starts_at timestamptz not null,
  venue text not null check (btrim(venue) <> ''),
  capacity integer not null check (capacity > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_owner_id_idx on public.event (owner_id);
create index event_published_starts_at_idx on public.event (starts_at) where status = 'published';
create index ticket_types_event_id_idx on public.ticket_types (event_id);
create unique index ticket_types_event_name_key
  on public.ticket_types (event_id, lower(btrim(name)));

create function public.set_event_management_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_event_updated_at
before update on public.event
for each row execute function public.set_event_management_updated_at();

create trigger set_ticket_type_updated_at
before update on public.ticket_types
for each row execute function public.set_event_management_updated_at();

create function public.enforce_ticket_capacity_within_event_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  affected_event_ids uuid[];
begin
  if tg_table_name = 'event' then
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
    from public.event as e
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

revoke all on function public.enforce_ticket_capacity_within_event_limit() from public;

create constraint trigger ticket_capacity_must_fit_event_limit_after_event_change
after insert or update of capacity on public.event
deferrable initially deferred
for each row execute function public.enforce_ticket_capacity_within_event_limit();

create constraint trigger ticket_capacity_must_fit_event_limit_after_ticket_change
after insert or update or delete on public.ticket_types
deferrable initially deferred
for each row execute function public.enforce_ticket_capacity_within_event_limit();

create function public.enforce_published_event_has_ticket_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_ids uuid[];
begin
  if tg_table_name = 'event' then
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
    from public.event as e
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

revoke all on function public.enforce_published_event_has_ticket_types() from public;

create constraint trigger published_event_requires_ticket_types_after_insert
after insert on public.event
deferrable initially deferred
for each row execute function public.enforce_published_event_has_ticket_types();

create constraint trigger published_event_requires_ticket_types_after_status_change
after update of status on public.event
deferrable initially deferred
for each row execute function public.enforce_published_event_has_ticket_types();

create constraint trigger published_event_requires_ticket_types_after_ticket_change
after insert or update or delete on public.ticket_types
deferrable initially deferred
for each row execute function public.enforce_published_event_has_ticket_types();

alter table public.event enable row level security;
alter table public.ticket_types enable row level security;

grant select on public.event, public.ticket_types to anon, authenticated;
grant insert, update, delete on public.event, public.ticket_types to authenticated;

create policy "Published events are public and owners can view their events"
on public.event
for select
using (status = 'published' or owner_id = (select auth.uid()));

create policy "Authenticated users can create their own events"
on public.event
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "Owners can update their events"
on public.event
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Owners can delete their events"
on public.event
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "Ticket types are public for published events and visible to owners"
on public.ticket_types
for select
using (
  exists (
    select 1
    from public.event as e
    where e.id = ticket_types.event_id
      and (e.status = 'published' or e.owner_id = (select auth.uid()))
  )
);

create policy "Owners can create ticket types for their events"
on public.ticket_types
for insert
to authenticated
with check (
  exists (
    select 1
    from public.event as e
    where e.id = ticket_types.event_id
      and e.owner_id = (select auth.uid())
  )
);

create policy "Owners can update ticket types for their events"
on public.ticket_types
for update
to authenticated
using (
  exists (
    select 1
    from public.event as e
    where e.id = ticket_types.event_id
      and e.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.event as e
    where e.id = ticket_types.event_id
      and e.owner_id = (select auth.uid())
  )
);

create policy "Owners can delete ticket types for their events"
on public.ticket_types
for delete
to authenticated
using (
  exists (
    select 1
    from public.event as e
    where e.id = ticket_types.event_id
      and e.owner_id = (select auth.uid())
  )
);
