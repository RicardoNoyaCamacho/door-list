-- Keep the first publication instant even when an event returns to draft.
alter table public.events add column published_at timestamptz;
alter table public.events add column published_at_estimated boolean not null default false;

-- Historical publication instants were not recorded. Use the earliest known
-- registration, or creation when none exists, and label the estimate in the UI.
update public.events e set
  published_at = coalesce((select min(r.created_at) from public.registrations r where r.event_id = e.id), e.created_at),
  published_at_estimated = true
where e.status = 'published' or exists (select 1 from public.registrations r where r.event_id = e.id);

create function public.track_event_first_publication()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.published_at = case when new.status = 'published' then now() else null end;
    new.published_at_estimated = false;
  else
    new.published_at = old.published_at;
    new.published_at_estimated = old.published_at_estimated;
    if new.status = 'published' and old.published_at is null then
      new.published_at = now();
      new.published_at_estimated = false;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.track_event_first_publication() from public;
create trigger track_event_first_publication
before insert or update on public.events
for each row execute function public.track_event_first_publication();

-- Aggregate in the database to avoid pagination and PostgREST row limits.
-- Security invoker preserves RLS; the owner predicate also hides public events
-- belonging to other organizers.
create function public.get_event_daily_registrations(p_event_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'published_at', e.published_at,
    'published_at_estimated', e.published_at_estimated,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', d.day::date,
        'registration_count', coalesce(counts.total, 0)
      ) order by d.day)
      from pg_catalog.generate_series(
        (e.published_at at time zone 'America/Mexico_City')::date::timestamp,
        (now() at time zone 'America/Mexico_City')::date::timestamp,
        interval '1 day'
      ) d(day)
      left join (
        select (r.created_at at time zone 'America/Mexico_City')::date as day, count(*) as total
        from public.registrations r
        where r.event_id = e.id and r.created_at >= e.published_at and r.created_at <= now()
        group by 1
      ) counts on counts.day = d.day::date
    ), '[]'::jsonb)
  ) from public.events e
  where e.id = p_event_id and e.owner_id = (select auth.uid());
$$;
revoke all on function public.get_event_daily_registrations(uuid) from public, anon, authenticated;
grant execute on function public.get_event_daily_registrations(uuid) to authenticated;
