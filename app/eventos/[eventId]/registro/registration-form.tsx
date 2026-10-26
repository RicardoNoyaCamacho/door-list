"use client";

import { useActionState, useState } from "react";
import { type PublicRegistrationEvent, type RegistrationState } from "@/lib/registration";
import { registerAttendee } from "./actions";

const field = "mt-1 w-full border border-[#18231f]/20 bg-white px-3 py-3 text-base outline-none focus:border-[#18231f] disabled:opacity-60";

export function RegistrationForm({ event }: { event: PublicRegistrationEvent }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [state, formAction, pending] = useActionState<RegistrationState, FormData>(
    async (previous, formData) => {
      try {
        const next = await registerAttendee(event.id, previous, formData);
        // Preserve refreshed options across validation errors and retries.
        return { ...next, availability: next.availability === undefined ? previous.availability : next.availability };
      } catch {
        return {
          status: "error",
          message: "No pudimos confirmar tu registro. Revisa tu conexión e intenta de nuevo; no se creará un duplicado.",
          availability: previous.availability,
        };
      }
    },
    { status: "idle" },
  );

  if (state.status === "success" && state.confirmation) {
    return (
      <section role="status" className="mt-8 border border-[#89a88a] bg-[#89a88a]/15 p-6">
        <h2 className="text-2xl font-semibold">¡Tu registro está confirmado!</h2>
        <p className="mt-3">Evento: {state.confirmation.eventTitle}</p>
        <p className="mt-1">Entrada: {state.confirmation.ticketName}</p>
      </section>
    );
  }

  if (state.availability === null) {
    return <p role="alert" className="mt-8 border border-[#b7452b] p-4">Este evento ya no está disponible para registro.</p>;
  }

  const tickets = (state.availability ?? event).ticket_types;
  const hasAvailability = tickets.some((ticket) => ticket.remaining > 0);
  const selectedTicket = tickets.some((ticket) => ticket.id === ticketId && ticket.remaining > 0) ? ticketId : "";

  return (
    <form action={formAction} aria-busy={pending} className="mt-8">
      <h2 className="text-2xl font-semibold">Regístrate al evento</h2>
      <p className="mt-2 text-sm text-[#4f5d56]">No necesitas una cuenta. Todos los campos son obligatorios.</p>
      {state.message && <p role="alert" className="mt-5 border border-[#b7452b] bg-[#ff6b4a]/10 p-4 text-sm">{state.message}</p>}
      {!hasAvailability && <p role="status" className="mt-5 border border-[#18231f]/20 p-4">No hay entradas disponibles.</p>}
      <fieldset disabled={pending || !hasAvailability} className="mt-6 space-y-5 disabled:opacity-70">
        <label className="block text-sm font-medium" htmlFor="ticket-type">Tipo de entrada
          <select id="ticket-type" name="ticket_type_id" required value={selectedTicket} onChange={(e) => setTicketId(e.target.value)} className={field} aria-invalid={!!state.fieldErrors?.ticket_type_id} aria-describedby={state.fieldErrors?.ticket_type_id ? "ticket-error" : undefined}>
            <option value="">Selecciona una entrada</option>
            {tickets.map((ticket) => <option key={ticket.id} value={ticket.id} disabled={ticket.remaining <= 0}>{ticket.name} · {ticket.remaining > 0 ? `${ticket.remaining} disponibles` : "Agotada"}</option>)}
          </select>
        </label>
        {state.fieldErrors?.ticket_type_id && <p id="ticket-error" className="text-sm text-[#b7452b]">{state.fieldErrors.ticket_type_id}</p>}
        <label className="block text-sm font-medium" htmlFor="attendee-name">Nombre
          <input id="attendee-name" name="name" autoComplete="name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} className={field} aria-invalid={!!state.fieldErrors?.name} aria-describedby={state.fieldErrors?.name ? "name-error" : undefined} />
        </label>
        {state.fieldErrors?.name && <p id="name-error" className="text-sm text-[#b7452b]">{state.fieldErrors.name}</p>}
        <label className="block text-sm font-medium" htmlFor="attendee-email">Email
          <input id="attendee-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={field} aria-invalid={!!state.fieldErrors?.email} aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} />
        </label>
        {state.fieldErrors?.email && <p id="email-error" className="text-sm text-[#b7452b]">{state.fieldErrors.email}</p>}
        <button type="submit" className="w-full bg-[#18231f] px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending || !hasAvailability}>{pending ? "Registrando…" : "Confirmar registro"}</button>
      </fieldset>
      <p role="status" className="mt-3 text-sm text-[#4f5d56]">{pending ? "Estamos comprobando la disponibilidad y guardando tu registro." : "El cupo se confirma al enviar el formulario."}</p>
    </form>
  );
}
