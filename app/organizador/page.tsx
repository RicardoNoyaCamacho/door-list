import { EmptyState } from "@/components/empty-state";
import { PageFrame } from "@/components/page-frame";
import { formField as field, pageTitle, primaryButton, secondaryButton, textLink, errorNotice } from "@/lib/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OrganizerForm } from "@/components/organizer-form";

import { localDateTime } from "@/lib/dates.mjs";
import { mapOrganizerEvent } from "@/lib/supabase/mappers";

// This authenticated dashboard depends on request cookies and live event data.
export const instant = false;

export default async function OrganizerPage() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/acceso");

  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, starts_at, venue, capacity, status, ticket_types(id, name, capacity)")
    .eq("owner_id", claims.claims.sub)
    .order("starts_at", { ascending: true });
  const events = (data ?? []).map(mapOrganizerEvent);
  const displayError = error ? "No pudimos consultar tus eventos. Intenta de nuevo." : null;

  return (
    <PageFrame>
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#18231f]/20 pb-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f5d56]">Panel de organizador</p>
          <h1 className={`mt-4 ${pageTitle}`}>Tus eventos</h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard" prefetch={false} className={secondaryButton}>Ver panel y asistentes</Link>
          <OrganizerForm endpoint="/api/sesion" method="DELETE" signOut><button className={secondaryButton}>Cerrar sesión</button></OrganizerForm>
        </div>
      </header>

      {displayError && <p role="alert" className={`mt-5 text-sm ${errorNotice}`}>{displayError}</p>}

      <section className="mt-10 min-w-0 border border-[#18231f]/15 bg-white/65 p-6">
        <h2 className="text-2xl font-semibold">Crear evento</h2>
        <p className="mt-4 text-sm text-[#4f5d56]">Los eventos se crean como borrador; podrás publicarlos después de añadir una entrada.</p>
        <OrganizerForm endpoint="/api/eventos" className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Nombre<input name="title" required className={field} /></label>
          <label className="text-sm font-medium">Lugar<input name="venue" required className={field} /></label>
          <label className="text-sm font-medium">Fecha y hora<input name="startsAt" type="datetime-local" required className={field} /></label>
          <label className="text-sm font-medium">Aforo total<input name="capacity" type="number" min="1" required className={field} /></label>
          <label className="text-sm font-medium md:col-span-2">Descripción<textarea name="description" rows={3} className={field} /></label>
          <button className={`w-fit ${primaryButton}`}>Crear borrador</button>
        </OrganizerForm>
      </section>

      {events.length > 0 && (
        <section className="mt-10 min-w-0 border border-[#18231f]/15 bg-white/65 p-6">
          <h2 className="text-2xl font-semibold">Crear tipo de entrada</h2>
          <p className="mt-4 text-sm text-[#4f5d56]">Selecciona uno de tus eventos registrados para asignarle la entrada.</p>
          <OrganizerForm endpoint="/api/eventos/:eventId/tipos-de-entrada" className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Evento<select name="eventId" required className={field}><option value="">Selecciona un evento</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
            <label className="text-sm font-medium">Nombre<input name="name" placeholder="Ej. General" required className={field} /></label>
            <label className="text-sm font-medium">Aforo<input name="capacity" type="number" min="1" required className={field} /></label>
            <button className={secondaryButton}>Añadir entrada</button>
          </OrganizerForm>
        </section>
      )}

      <section aria-label="Tus eventos" className="mt-10 space-y-6">
        {!displayError && events.length === 0 && <EmptyState title="Aún no hay eventos" description="Usa el formulario de creación para añadir tu primer evento." />}
        {events.map((event) => {
          const assigned = event.ticketTypes.reduce((total, ticketType) => total + ticketType.capacity, 0);
          return (
            <article key={event.id} className="min-w-0 border border-[#18231f]/15 bg-white/65 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 break-words text-2xl font-semibold">{event.title}</h2>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#4f5d56]">{event.status === "published" ? "Publicado" : "Borrador"}</span>
              </div>
              {event.status === "published" && (
                <Link href={`/eventos/${event.id}/registro`} prefetch={false} className={`mt-4 inline-block ${textLink}`}>Abrir página pública de registro</Link>
              )}
              <OrganizerForm endpoint={`/api/eventos/${event.id}`} method="PATCH" className="mt-5 grid gap-4 md:grid-cols-2">
                <input type="hidden" name="eventId" value={event.id} />
                <label className="text-sm font-medium">Nombre<input name="title" defaultValue={event.title} required className={field} /></label>
                <label className="text-sm font-medium">Lugar<input name="venue" defaultValue={event.venue} required className={field} /></label>
                <label className="text-sm font-medium">Fecha y hora<input name="startsAt" type="datetime-local" defaultValue={localDateTime(event.startsAt)} required className={field} /></label>
                <label className="text-sm font-medium">Aforo total<input name="capacity" type="number" min="1" defaultValue={event.capacity} required className={field} /></label>
                <label className="text-sm font-medium">Estado<select name="status" defaultValue={event.status} className={field}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
                <label className="text-sm font-medium md:col-span-2">Descripción<textarea name="description" rows={3} defaultValue={event.description} className={field} /></label>
                <button className={`w-fit ${primaryButton}`}>Guardar evento</button>
              </OrganizerForm>
              <OrganizerForm endpoint={`/api/eventos/${event.id}`} method="DELETE" className="mt-3"><input type="hidden" name="eventId" value={event.id} /><button className={`text-[#b7452b] ${textLink} disabled:cursor-not-allowed disabled:opacity-60`}>Eliminar evento</button></OrganizerForm>

              <div className="mt-10 border-t border-[#18231f]/15 pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="break-words text-lg font-semibold">Tipos de entrada</h3><p className="text-sm text-[#4f5d56]">Aforo asignado: {assigned} / {event.capacity}</p></div>
                <div className="mt-5 space-y-4">
                  {event.ticketTypes.length === 0 && <EmptyState title="Aún no hay tipos de entrada" description="Añade una entrada con el formulario de arriba para poder publicar este evento." />}
                  {event.ticketTypes.map((ticketType) => (
                    <div key={ticketType.id} className="min-w-0 border border-[#18231f]/15 p-6">
                      <OrganizerForm endpoint={`/api/eventos/${event.id}/tipos-de-entrada/${ticketType.id}`} method="PATCH" className="grid gap-4 md:grid-cols-2">
                        <input type="hidden" name="ticketTypeId" value={ticketType.id} /><input type="hidden" name="eventId" value={event.id} />
                        <label className="min-w-0 text-sm font-medium">Nombre<input name="name" defaultValue={ticketType.name} required className={field} /></label>
                        <label className="min-w-0 text-sm font-medium">Aforo<input name="capacity" type="number" min="1" defaultValue={ticketType.capacity} required className={field} /></label>
                        <button className={secondaryButton}>Guardar</button>
                      </OrganizerForm>
                      <OrganizerForm endpoint={`/api/eventos/${event.id}/tipos-de-entrada/${ticketType.id}`} method="DELETE" className="mt-4"><input type="hidden" name="ticketTypeId" value={ticketType.id} /><button className={`text-[#b7452b] ${textLink} disabled:cursor-not-allowed disabled:opacity-60`}>Eliminar</button></OrganizerForm>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </PageFrame>
  );
}
