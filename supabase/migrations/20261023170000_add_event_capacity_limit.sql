alter table public.event
add column if not exists capacity integer;

update public.event as e
set capacity = greatest(
  1,
  coalesce(
    (
      select sum(tt.capacity)
      from public.ticket_types as tt
      where tt.event_id = e.id
    ),
    0
  )
)
where e.capacity is null;

alter table public.event
alter column capacity set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.event'::regclass and conname = 'event_capacity_positive'
  ) then
    alter table public.event add constraint event_capacity_positive check (capacity > 0);
  end if;
end;
$$;

create or replace function public.enforce_ticket_capacity_within_event_limit()
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

drop trigger if exists ticket_capacity_must_fit_event_limit_after_event_change on public.event;
create constraint trigger ticket_capacity_must_fit_event_limit_after_event_change
after insert or update of capacity on public.event
deferrable initially deferred
for each row execute function public.enforce_ticket_capacity_within_event_limit();

drop trigger if exists ticket_capacity_must_fit_event_limit_after_ticket_change on public.ticket_types;
create constraint trigger ticket_capacity_must_fit_event_limit_after_ticket_change
after insert or update or delete on public.ticket_types
deferrable initially deferred
for each row execute function public.enforce_ticket_capacity_within_event_limit();
