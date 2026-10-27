import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { eventTimeZone, registrationDayStart, type PublicEvent } from "@/lib/public-events";

export const instant = false;

export default async function Home() {
  await connection();
  let events: PublicEvent[] = [];
  let queryFailed = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, starts_at, venue")
      .eq("status", "published")
      .gte("starts_at", registrationDayStart())
      .order("starts_at", { ascending: true });
    if (error) throw new Error("Public events unavailable");
    events = (data ?? []) as PublicEvent[];
  } catch {
    queryFailed = true;
  }
  const date = new Intl.DateTimeFormat("es-MX", {
    timeZone: eventTimeZone, dateStyle: "long", timeStyle: "short",
  });

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-5 py-10 text-[#18231f] sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#18231f]/20 pb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f5d56]">Door List · Eventos</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Encuentra tu próximo evento</h1>
            <p className="mt-4 max-w-2xl text-[#4f5d56]">Descubre los eventos con registro abierto y reserva tu entrada sin crear una cuenta.</p>
          </div>
          <Link href="/organizador" prefetch={false} className="border border-[#18231f] px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">Acceso para organizadores</Link>
        </header>

        <section aria-labelledby="events-heading" className="mt-10">
          <h2 id="events-heading" className="text-2xl font-semibold">Eventos con registro abierto</h2>
          <p className="mt-2 text-sm text-[#4f5d56]">Las fechas y horas se muestran en hora de Ciudad de México. El cupo se confirma al registrarte.</p>
          {queryFailed ? (
            <div role="alert" className="mt-6 border border-[#b7452b] bg-[#ff6b4a]/10 p-6">
              <p>No pudimos consultar los eventos. Intenta de nuevo.</p>
              <form action="/" method="get" className="mt-3">
                <button type="submit" className="font-semibold underline">Volver a cargar</button>
              </form>
            </div>
          ) : events.length === 0 ? (
            <p role="status" className="mt-6 border border-[#18231f]/15 bg-white/65 p-6 text-[#4f5d56]">No hay eventos disponibles para registro.</p>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {events.map((event) => (
                <article key={event.id} className="flex min-w-0 flex-col border border-[#18231f]/15 bg-white/65 p-6 shadow-[0_24px_80px_rgba(24,35,31,0.06)] sm:p-8">
                  <h3 className="break-words text-2xl font-semibold tracking-[-0.025em]">{event.title}</h3>
                  <p className="mt-4"><time dateTime={event.starts_at}>{date.format(new Date(event.starts_at))}</time></p>
                  <p className="mt-2 break-words font-medium">{event.venue}</p>
                  {event.description && <p className="mt-4 whitespace-pre-wrap break-words text-[#4f5d56]">{event.description}</p>}
                  <div className="mt-auto pt-6">
                    <Link href={`/eventos/${event.id}/registro`} prefetch={false} className="inline-block bg-[#18231f] px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f]">Registrarme<span className="sr-only"> a {event.title}</span></Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
