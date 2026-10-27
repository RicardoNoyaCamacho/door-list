import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTicketCode, type PublicTicket, ticketStatusDetails } from "@/lib/ticket";
import { ticketQrDataUrl } from "@/lib/ticket-qr";
import { RefreshStatus } from "./refresh-status";

export const instant = false;
export const metadata: Metadata = {
  title: "Tu entrada | Door List",
  description: "Consulta los datos y el estado actual de tu entrada.",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  if (!isTicketCode(code)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_ticket", { p_code: code });
  if (error) throw new Error("No se pudo consultar la entrada.");
  if (!data) notFound();
  const ticket = data as PublicTicket;
  const details = ticketStatusDetails[ticket.status];
  const qr = await ticketQrDataUrl(ticket.code);
  const date = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City", dateStyle: "long", timeStyle: "short",
  }).format(new Date(ticket.event.starts_at));

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-5 py-12 text-[#18231f] sm:px-10">
      <article className="mx-auto max-w-2xl border border-[#18231f]/15 bg-white/65 p-6 shadow-[0_24px_80px_rgba(24,35,31,0.08)] sm:p-10">
        <header className="border-b border-[#18231f]/20 pb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f5d56]">Tu entrada</p>
          <h1 className="mt-3 break-words text-4xl font-semibold tracking-[-0.045em]">{ticket.event.title}</h1>
          <p className="mt-5"><time dateTime={ticket.event.starts_at}>{date}</time></p>
          <p className="mt-1 text-sm text-[#4f5d56]">Hora de Ciudad de México</p>
          <p className="mt-3 break-words">{ticket.event.venue}</p>
        </header>
        <section className="mt-7" aria-label="Datos del asistente">
          <dl className="space-y-4">
            <div><dt className="text-sm text-[#4f5d56]">Nombre</dt><dd className="break-words font-semibold">{ticket.attendee.name}</dd></div>
            <div><dt className="text-sm text-[#4f5d56]">Email</dt><dd className="break-all">{ticket.attendee.email}</dd></div>
            <div><dt className="text-sm text-[#4f5d56]">Tipo de entrada</dt><dd className="break-words">{ticket.ticket_type.name}</dd></div>
          </dl>
        </section>
        <section aria-label="Estado de la entrada" className={`mt-7 border p-4 ${ticket.status === "valid" ? "border-[#89a88a] bg-[#89a88a]/15" : "border-[#b7452b] bg-[#ff6b4a]/10"}`}>
          <h2 className="text-xl font-semibold">{details.label}</h2>
          <p className="mt-2 text-sm">{details.description}</p>
          <RefreshStatus />
        </section>
        <figure className="mt-7">
          <Image src={qr} alt="Código QR de tu entrada" width={280} height={280} unoptimized className="mx-auto h-auto max-w-full bg-white" />
          <figcaption className="mt-4 text-sm">
            <span className="font-semibold">Código de entrada</span>
            <code className="mt-2 block select-all break-all border border-[#18231f]/15 bg-white p-3">{ticket.code}</code>
          </figcaption>
        </figure>
        <p className="mt-6 text-sm text-[#4f5d56]">Este enlace permite consultar tu entrada y tus datos. Guárdalo en un lugar privado.</p>
      </article>
    </main>
  );
}
