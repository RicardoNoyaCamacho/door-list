import { AttendeeTable } from "./attendee-table";
import { EmptyState } from "@/components/empty-state";
import { textLink, pageTitle } from "@/lib/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { dashboardPage, getDashboardEvent } from "@/lib/dashboard";
import { formatEventDate } from "@/lib/dates.mjs";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { EventDailyRegistrations } from "./daily-registrations";

export default async function OrganizerEventDashboardPage({ params, searchParams }: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  await connection();
  const { eventId } = await params;
  const page = dashboardPage((await searchParams).pagina);
  const event = await getDashboardEvent(eventId, page);
  if (!event) notFound();
  const ticketTypeNames = new Map(event.ticketTypes.map((type) => [type.id, type.name]));
  return (
    <>
      <Link href="/dashboard" prefetch={false} className={`mt-10 inline-block ${textLink}`}>Volver a tus eventos</Link>
      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f5d56]">{event.status === "published" ? "Publicado" : "Borrador"}</p>
        <h1 className={`mt-4 ${pageTitle}`}>{event.title}</h1>
        <p className="mt-4"><time dateTime={event.startsAt}>{formatEventDate(event.startsAt)}</time> · Hora de Ciudad de México</p>
        <p className="mt-2 break-words text-[#4f5d56]">{event.venue}</p>
        <p className="mt-6 text-xl font-semibold">{event.registrationCount} / {event.capacity} registros sobre el aforo total</p>
      </header>
      <EventDailyRegistrations key={event.id} eventId={event.id} />
      <section aria-labelledby="ticket-types-heading" className="mt-10">
        <h2 id="ticket-types-heading" className="text-2xl font-semibold">Tipos de entrada</h2>
        {event.ticketTypes.length === 0 ? <div className="mt-5"><EmptyState title="Aún no hay tipos de entrada" description="Añade un tipo de entrada desde la gestión de eventos para asignar el aforo." /></div> : (
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {event.ticketTypes.map((type) => (
              <article key={type.id} className="min-w-0 border border-[#18231f]/15 bg-white/65 p-6">
                <h3 className="break-words text-lg font-semibold">{type.name}</h3>
                <p className="mt-4"><strong>{type.registrationCount} / {type.capacity}</strong> registros</p>
                <progress aria-label={`Aforo de ${type.name}`} value={type.registrationCount} max={type.capacity} className="mt-3 h-2 w-full accent-[#18231f]" />
              </article>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="attendees-heading" className="mt-10">
        <h2 id="attendees-heading" className="text-2xl font-semibold">Asistentes registrados ({event.registrationCount})</h2>
        <AttendeeTable state={{ status: "ready", registrations: event.registrations, total: event.registrationCount, ticketTypeNames }} />
        <DashboardPagination pathname={`/dashboard/eventos/${event.id}`} page={page} total={event.registrationCount} />
      </section>
    </>
  );
}
