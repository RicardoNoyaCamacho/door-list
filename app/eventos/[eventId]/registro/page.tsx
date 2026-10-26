import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type PublicRegistrationEvent, uuidPattern } from "@/lib/registration";
import { RegistrationForm } from "./registration-form";

export const metadata = { title: "Registro al evento | Door List" };

export default async function PublicRegistrationPage({ params }: { params: Promise<{ eventId: string }> }) {
  await connection();
  const { eventId } = await params;
  if (!uuidPattern.test(eventId)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_registration_event", { p_event_id: eventId });
  if (error) throw new Error("No se pudo consultar el evento.");
  if (!data) notFound();
  const event = data as PublicRegistrationEvent;
  const date = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City", dateStyle: "long", timeStyle: "short",
  }).format(new Date(event.starts_at));

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-5 py-12 text-[#18231f] sm:px-10">
      <article className="mx-auto max-w-2xl border border-[#18231f]/15 bg-white/65 p-6 shadow-[0_24px_80px_rgba(24,35,31,0.08)] sm:p-10">
        <header className="border-b border-[#18231f]/20 pb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f5d56]">Registro público</p>
          <h1 className="mt-3 break-words text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{event.title}</h1>
          <p className="mt-5"><time dateTime={event.starts_at}>{date}</time></p>
          <p className="mt-1 text-sm text-[#4f5d56]">Hora de Ciudad de México</p>
          <p className="mt-3">{event.venue}</p>
          {event.description && <p className="mt-5 whitespace-pre-wrap break-words text-[#4f5d56]">{event.description}</p>}
        </header>
        <RegistrationForm event={event} />
      </article>
    </main>
  );
}
