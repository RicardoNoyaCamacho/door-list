import { PageFrame } from "@/components/page-frame";
import { pageTitle } from "@/lib/ui";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatEventDate } from "@/lib/dates.mjs";
import { mapRegistrationEvent } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/registration";
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
  const event = mapRegistrationEvent(data);
  const date = formatEventDate(event.startsAt);

  return (
    <PageFrame>
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#18231f]/20 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">Door List · Registro público</p>
      </header>
      <article className="mt-10 min-w-0">
        <header>
          <h1 className={pageTitle}>{event.title}</h1>
          <p className="mt-4"><time dateTime={event.startsAt}>{date}</time></p>
          <p className="mt-1 text-sm text-[#4f5d56]">Hora de Ciudad de México</p>
          <p className="mt-4 break-words">{event.venue}</p>
          {event.description && <p className="mt-4 whitespace-pre-wrap break-words text-[#4f5d56]">{event.description}</p>}
        </header>
        <RegistrationForm event={event} />
      </article>
    </PageFrame>
  );
}
