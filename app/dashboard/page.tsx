import Link from "next/link";
import { connection } from "next/server";
import { getDashboardEvents, dashboardPage } from "@/lib/dashboard";
import { formatEventDate } from "@/lib/dates.mjs";
import { DashboardPagination } from "@/components/dashboard-pagination";

export default async function OrganizerDashboardPage({ searchParams }: {
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  await connection();
  const page = dashboardPage((await searchParams).pagina);
  const { events, total } = await getDashboardEvents(page);
  return (
    <section className="mt-10">
      <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Tus eventos</h1>
      <p className="mt-4 text-[#4f5d56]">Consulta el aforo y los asistentes registrados de cada evento.</p>
      {events.length === 0 ? (
        <div role="status" className="mt-8 border border-[#18231f]/15 bg-white/65 p-6">
          <p>{total === 0 ? "Aún no tienes eventos." : "No hay eventos en esta página."}</p>
          <Link href={total === 0 ? "/organizador" : "/dashboard"} prefetch={false} className="mt-4 inline-block font-semibold underline">{total === 0 ? "Crear un evento" : "Volver al inicio"}</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="flex min-w-0 flex-col border border-[#18231f]/15 bg-white/65 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#4f5d56]">{event.status === "published" ? "Publicado" : "Borrador"}</p>
              <h2 className="mt-3 break-words text-2xl font-semibold">{event.title}</h2>
              <time dateTime={event.startsAt} className="mt-4">{formatEventDate(event.startsAt)}</time>
              <p className="mt-2 break-words text-[#4f5d56]">{event.venue}</p>
              <p className="mt-2 text-sm">Aforo total: {event.capacity}</p>
              <Link href={`/dashboard/eventos/${event.id}`} prefetch={false} className="mt-6 w-fit bg-[#18231f] px-5 py-3 font-semibold text-white">Ver registros<span className="sr-only"> de {event.title}</span></Link>
            </article>
          ))}
        </div>
      )}
      <DashboardPagination pathname="/dashboard" page={page} total={total} />
    </section>
  );
}
