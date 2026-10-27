"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { type PublicRegistrationEvent, type RegistrationState, validateRegistration } from "@/lib/registration";
import { ticketPath } from "@/lib/ticket";
import { jsonRequest, requestJson } from "@/lib/api-client";
import { ApiError, errorMessage } from "@/lib/api-errors";
import type { RegistrationInput, RegistrationConfirmation } from "@/lib/domain";

const field = "mt-1 w-full border border-[#18231f]/20 bg-white px-3 py-3 text-base outline-none focus:border-[#18231f] disabled:opacity-60";

export function RegistrationForm({ event }: { event: PublicRegistrationEvent }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [state, formAction, pending] = useActionState<RegistrationState, FormData>(
    async (previous, formData) => {
      const input: RegistrationInput = {
        name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? ""),
        ticketTypeId: String(formData.get("ticketTypeId") ?? ""),
      };
      const { fieldErrors } = validateRegistration(input);
      if (Object.keys(fieldErrors).length) {
        return { status: "error", message: errorMessage("invalidInput"), fieldErrors, availability: previous.availability };
      }
      try {
        const confirmation = await requestJson<RegistrationConfirmation>(
          `/api/eventos/${event.id}/registros`, jsonRequest(input),
        );
        return { status: "success", confirmation };
      } catch (error) {
        if (error instanceof ApiError && error.code === "eventUnavailable") {
          return { status: "error", message: errorMessage(error.code), availability: null };
        }
        if (error instanceof ApiError && error.code === "ticketUnavailable") {
          try {
            const availability = await requestJson<PublicRegistrationEvent>(`/api/eventos/${event.id}/disponibilidad`);
            return { status: "error", message: errorMessage(error.code), availability };
          } catch (refreshError) {
            if (refreshError instanceof ApiError && refreshError.code === "eventUnavailable") {
              return { status: "error", message: errorMessage(refreshError.code), availability: null };
            }
            return {
              status: "error", availability: previous.availability,
              message: "Esta entrada ya no está disponible. No pudimos actualizar las opciones; recarga la página para consultar el cupo actual.",
            };
          }
        }
        return {
          status: "error", availability: previous.availability,
          message: error instanceof ApiError ? errorMessage(error.code) : "No pudimos confirmar tu registro. Revisa tu conexión e intenta de nuevo; no se creará un duplicado.",
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
        <p className="mt-1">Entrada: {state.confirmation.ticketTypeName}</p>
        {state.confirmation.emailStatus === "sent" ? (
          <p className="mt-3">Te enviamos un email con los datos del evento y tu QR. Revisa también la carpeta de spam.</p>
        ) : (
          <p role="alert" className="mt-3 text-[#b7452b]">Tu entrada está confirmada, pero no pudimos enviar el email. Abre tu entrada y guarda su enlace para conservar el QR.</p>
        )}
        <Link href={ticketPath(state.confirmation.ticketCode)} prefetch={false} className="mt-5 inline-block bg-[#18231f] px-5 py-3 font-semibold text-white">Ver mi entrada y QR</Link>
        <p className="mt-3 text-sm text-[#4f5d56]">Guarda el enlace de tu entrada para consultarla después.</p>
      </section>
    );
  }

  if (state.availability === null) {
    return <p role="alert" className="mt-8 border border-[#b7452b] p-4">Este evento ya no está disponible para registro.</p>;
  }

  const ticketTypes = (state.availability ?? event).ticketTypes;
  const hasAvailability = ticketTypes.some((ticketType) => ticketType.remaining > 0);
  const selectedTicketTypeId = ticketTypes.some((ticketType) => ticketType.id === ticketTypeId && ticketType.remaining > 0) ? ticketTypeId : "";

  return (
    <form action={formAction} aria-busy={pending} className="mt-8">
      <h2 className="text-2xl font-semibold">Regístrate al evento</h2>
      <p className="mt-2 text-sm text-[#4f5d56]">No necesitas una cuenta. Todos los campos son obligatorios.</p>
      {state.message && <p role="alert" className="mt-5 border border-[#b7452b] bg-[#ff6b4a]/10 p-4 text-sm">{state.message}</p>}
      {!hasAvailability && <p role="status" className="mt-5 border border-[#18231f]/20 p-4">No hay entradas disponibles.</p>}
      <fieldset disabled={pending || !hasAvailability} className="mt-6 space-y-5 disabled:opacity-70">
        <label className="block text-sm font-medium" htmlFor="ticket-type">Tipo de entrada
          <select id="ticket-type" name="ticketTypeId" required value={selectedTicketTypeId} onChange={(e) => setTicketTypeId(e.target.value)} className={field} aria-invalid={!!state.fieldErrors?.ticketTypeId} aria-describedby={state.fieldErrors?.ticketTypeId ? "ticket-error" : undefined}>
            <option value="">Selecciona una entrada</option>
            {ticketTypes.map((ticketType) => <option key={ticketType.id} value={ticketType.id} disabled={ticketType.remaining <= 0}>{ticketType.name} · {ticketType.remaining > 0 ? `${ticketType.remaining} disponibles` : "Agotada"}</option>)}
          </select>
        </label>
        {state.fieldErrors?.ticketTypeId && <p id="ticket-error" className="text-sm text-[#b7452b]">{state.fieldErrors.ticketTypeId}</p>}
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
      <p role="status" className="mt-3 text-sm text-[#4f5d56]">{pending ? "Estamos comprobando la disponibilidad, guardando tu registro y enviando tu entrada por email." : "El cupo se confirma al enviar el formulario."}</p>
    </form>
  );
}
