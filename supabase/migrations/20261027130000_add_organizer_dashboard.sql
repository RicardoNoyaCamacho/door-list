-- Personal data is readable only by the owner of the parent event.
grant select on public.registrations to authenticated;
create policy "Owners can view registrations for their events"
on public.registrations for select to authenticated
using (exists (
  select 1 from public.events e
  where e.id = registrations.event_id and e.owner_id = (select auth.uid())
));

-- One snapshot for totals and the attendee page. Counts never depend on the
-- PostgREST row limit or on how many attendees are displayed on the page.
create function public.get_organizer_event(p_event_id uuid, p_offset integer default 0)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description,
    'starts_at', e.starts_at, 'venue', e.venue,
    'capacity', e.capacity, 'status', e.status,
    'registration_count', (select count(*) from public.registrations r where r.event_id = e.id),
    'ticket_types', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'capacity', t.capacity,
        'registration_count', (select count(*) from public.registrations r where r.ticket_type_id = t.id)
      ) order by t.name, t.id)
      from public.ticket_types t where t.event_id = e.id
    ), '[]'::jsonb),
    'registrations', coalesce((
      select jsonb_agg(to_jsonb(attendee) order by attendee.created_at desc, attendee.id desc)
      from (
        select r.id, r.ticket_type_id, r.name, r.email, r.created_at
        from public.registrations r where r.event_id = e.id
        order by r.created_at desc, r.id desc
        limit 50 offset greatest(coalesce(p_offset, 0), 0)
      ) attendee
    ), '[]'::jsonb)
  ) from public.events e
  where e.id = p_event_id and e.owner_id = (select auth.uid());
$$;

revoke all on function public.get_organizer_event(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_organizer_event(uuid, integer) to authenticated;
