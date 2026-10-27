"use server";

import { mapPublicTicket, mapRegistrationEvent, mapRegistrationResult, registrationArguments } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import { isTicketCode } from "@/lib/ticket";
import { sendTicketEmail } from "@/lib/ticket-email";
import { type RegistrationState, uuidPattern, validateRegistration } from "@/lib/registration";

export async function registerAttendee(
  eventId: string,
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const { name, email, ticketTypeId, fieldErrors } = validateRegistration(formData);
  if (!uuidPattern.test(eventId)) {
    return { status: "error", message: "Este evento no está disponible para registro.", availability: null };
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Revisa los campos indicados.", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const register = () => supabase.rpc("register_event_attendee", registrationArguments(eventId, ticketTypeId, name, email));
    let { data, error } = await register();
    // A concurrent ticket edit/delete can invert row-lock acquisition. A
    // deadlock rolls back the whole RPC, so one fresh attempt is safe.
    if (error?.code === "40P01") ({ data, error } = await register());
    if (error) throw error;

    const result = mapRegistrationResult(data);
    switch (result.code) {
      case "success": {
        if (!isTicketCode(result.ticketCode)) throw new Error("Missing issued ticket");
        let emailStatus: "sent" | "failed" = "failed";
        try {
          const { data: ticket, error: ticketError } = await supabase.rpc("get_public_ticket", { p_code: result.ticketCode });
          if (ticketError || !ticket || ticket.code !== result.ticketCode) throw new Error("Missing ticket email details");
          await sendTicketEmail(mapPublicTicket(ticket), {
            apiKey: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM_EMAIL,
          });
          emailStatus = "sent";
        } catch {
          // Registration and ticket are already committed; never turn an email
          // failure into a registration retry or expose provider error details.
          console.error("No se pudo enviar el email de confirmación de entrada.");
        }
        return {
          status: "success",
          confirmation: { eventTitle: result.eventTitle, ticketTypeName: result.ticketTypeName, ticketCode: result.ticketCode, emailStatus },
        };
      }
      case "duplicate":
        return { status: "error", message: "Este email ya tiene un registro para este evento." };
      case "eventUnavailable":
        return { status: "error", message: "Este evento ya no está disponible para registro.", availability: null };
      case "ticketUnavailable": {
        const { data: availability, error: refreshError } = await supabase.rpc("get_public_registration_event", { p_event_id: eventId });
        if (refreshError) {
          return { status: "error", message: "Esta entrada ya no está disponible. No pudimos actualizar las opciones; recarga la página para consultar el cupo actual." };
        }
        return {
          status: "error",
          message: availability ? "Esta entrada se agotó o ya no está disponible. Elige otra opción." : "Este evento ya no está disponible para registro.",
          availability: availability ? mapRegistrationEvent(availability) : null,
        };
      }
      case "invalidInput":
        return { status: "error", message: "Revisa tu nombre, email y tipo de entrada." };
      default:
        throw new Error("Unexpected registration result");
    }
  } catch {
    return { status: "error", message: "No pudimos confirmar tu registro. Intenta de nuevo; si ya se guardó, no se creará un duplicado." };
  }
}
