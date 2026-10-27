import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createEvent,
  createTicketType,
  deleteEvent,
  deleteTicketType,
  signOut,
  updateEvent,
  updateTicketType,
} from "./actions";

// This authenticated dashboard depends on request cookies and live event data.
export const instant = false;

type TicketType = { id: string; name: string; capacity: number };
type Event = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  venue: string;
  capacity: number;
  status: "draft" | "published";
  ticket_types: TicketType[];
};

function localDateTime(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

const field = "mt-1 w-full border border-[#18231f]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#18231f]";

export default async function OrganizerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/acceso");

  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, starts_at, venue, capacity, status, ticket_types(id, name, capacity)")
    .order("starts_at", { ascending: true });
  const events = (data ?? []) as Event[];
  const { error: queryError } = await searchParams;
  const displayError = queryError ?? error?.message;

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-5 py-10 text-[#18231f] sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#18231f]/20 pb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f5d56]">Panel de organizador</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Tus eventos</h1>
          </div>
          <form action={signOut}><button className="border border-[#18231f] px-4 py-2 text-sm font-semibold">Cerrar sesión</button></form>
        </header>

        {displayError && <p role="alert" className="mt-6 border border-[#b7452b] bg-[#ff6b4a]/15 px-4 py-3 text-sm">{displayError}</p>}

        <section className="mt-10 border border-[#18231f]/15 bg-white/65 p-6">
          <h2 className="text-2xl font-semibold">Crear evento</h2>
          <p className="mt-1 text-sm text-[#4f5d56]">Los eventos se crean como borrador; podrás publicarlos después de añadir una entrada.</p>
          <form action={createEvent} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Nombre<input name="title" required className={field} /></label>
            <label className="text-sm font-medium">Lugar<input name="venue" required className={field} /></label>
            <label className="text-sm font-medium">Fecha y hora<input name="starts_at" type="datetime-local" required className={field} /></label>
            <label className="text-sm font-medium">Aforo total<input name="capacity" type="number" min="1" required className={field} /></label>
            <label className="text-sm font-medium md:col-span-2">Descripción<textarea name="description" rows={3} className={field} /></label>
            <button className="w-fit bg-[#18231f] px-5 py-3 text-sm font-semibold text-white">Crear borrador</button>
          </form>
        </section>

        {events.length > 0 && (
          <section className="mt-6 border border-[#18231f]/15 bg-white/65 p-6">
            <h2 className="text-2xl font-semibold">Crear tipo de entrada</h2>
            <p className="mt-1 text-sm text-[#4f5d56]">Selecciona uno de tus eventos registrados para asignarle la entrada.</p>
            <form action={createTicketType} className="mt-6 flex flex-wrap items-end gap-4">
              <label className="text-sm font-medium">Evento<select name="event_id" required className={`${field} min-w-56`}><option value="">Selecciona un evento</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
              <label className="text-sm font-medium">Nombre<input name="name" placeholder="Ej. General" required className={`${field} w-48`} /></label>
              <label className="text-sm font-medium">Aforo<input name="capacity" type="number" min="1" required className={`${field} w-28`} /></label>
              <button className="border border-[#18231f] px-4 py-2 text-sm font-semibold">Añadir entrada</button>
            </form>
          </section>
        )}

        <section className="mt-10 space-y-8">
          {events.length === 0 && <p className="text-[#4f5d56]">Aún no tienes eventos.</p>}
          {events.map((event) => {
            const assigned = event.ticket_types.reduce((total, ticketType) => total + ticketType.capacity, 0);
            return (
              <article key={event.id} className="border border-[#18231f]/15 bg-white/65 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">{event.title}</h2>
                  <span className="border border-[#18231f]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{event.status === "published" ? "Publicado" : "Borrador"}</span>
                </div>
                {event.status === "published" && (
                  <Link href={`/eventos/${event.id}/registro`} prefetch={false} className="mt-4 inline-block text-sm font-semibold underline">Abrir página pública de registro</Link>
                )}
                <form action={updateEvent} className="mt-5 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="event_id" value={event.id} />
                  <label className="text-sm font-medium">Nombre<input name="title" defaultValue={event.title} required className={field} /></label>
                  <label className="text-sm font-medium">Lugar<input name="venue" defaultValue={event.venue} required className={field} /></label>
                  <label className="text-sm font-medium">Fecha y hora<input name="starts_at" type="datetime-local" defaultValue={localDateTime(event.starts_at)} required className={field} /></label>
                  <label className="text-sm font-medium">Aforo total<input name="capacity" type="number" min="1" defaultValue={event.capacity} required className={field} /></label>
                  <label className="text-sm font-medium">Estado<select name="status" defaultValue={event.status} className={field}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
                  <label className="text-sm font-medium md:col-span-2">Descripción<textarea name="description" rows={3} defaultValue={event.description} className={field} /></label>
                  <button className="w-fit bg-[#18231f] px-5 py-3 text-sm font-semibold text-white">Guardar evento</button>
                </form>
                <form action={deleteEvent} className="mt-3"><input type="hidden" name="event_id" value={event.id} /><button className="text-sm font-semibold text-[#b7452b]">Eliminar evento</button></form>

                <div className="mt-8 border-t border-[#18231f]/15 pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-semibold">Tipos de entrada</h3><p className="text-sm text-[#4f5d56]">Aforo asignado: {assigned} / {event.capacity}</p></div>
                  <div className="mt-4 space-y-3">
                    {event.ticket_types.map((ticketType) => (
                      <div key={ticketType.id} className="flex flex-wrap items-end gap-3 border border-[#18231f]/10 p-3">
                        <form action={updateTicketType} className="flex flex-wrap items-end gap-3">
                          <input type="hidden" name="ticket_type_id" value={ticketType.id} /><input type="hidden" name="event_id" value={event.id} />
                          <label className="text-xs font-medium">Nombre<input name="name" defaultValue={ticketType.name} required className={`${field} w-44`} /></label>
                          <label className="text-xs font-medium">Aforo<input name="capacity" type="number" min="1" defaultValue={ticketType.capacity} required className={`${field} w-24`} /></label>
                          <button className="border border-[#18231f] px-3 py-2 text-sm font-semibold">Guardar</button>
                        </form>
                        <form action={deleteTicketType}><input type="hidden" name="ticket_type_id" value={ticketType.id} /><button className="pb-2 text-sm font-semibold text-[#b7452b]">Eliminar</button></form>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
