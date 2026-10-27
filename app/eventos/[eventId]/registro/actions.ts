"use server";

import { createClient } from "@/lib/supabase/server";
import { isTicketCode, type PublicTicket } from "@/lib/ticket";
import { sendTicketEmail } from "@/lib/ticket-email";
import { type PublicRegistrationEvent, type RegistrationState, uuidPattern, validateRegistration } from "@/lib/registration";

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
    const register = () => supabase.rpc("register_event_attendee", {
      p_event_id: eventId,
      p_ticket_type_id: ticketTypeId,
      p_name: name,
      p_email: email,
    });
    let { data, error } = await register();
    // A concurrent ticket edit/delete can invert row-lock acquisition. A
    // deadlock rolls back the whole RPC, so one fresh attempt is safe.
    if (error?.code === "40P01") ({ data, error } = await register());
    if (error) throw error;

    switch (data?.code) {
      case "success": {
        if (!isTicketCode(data.ticket_code)) throw new Error("Missing issued ticket");
        let emailStatus: "sent" | "failed" = "failed";
        try {
          const { data: ticket, error: ticketError } = await supabase.rpc("get_public_ticket", { p_code: data.ticket_code });
          if (ticketError || !ticket || ticket.code !== data.ticket_code) throw new Error("Missing ticket email details");
          await sendTicketEmail(ticket as PublicTicket, {
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
          confirmation: { eventTitle: data.event_title, ticketTypeName: data.ticket_type_name, ticketCode: data.ticket_code, emailStatus },
        };
      }
      case "duplicate":
        return { status: "error", message: "Este email ya tiene un registro para este evento." };
      case "event_unavailable":
        return { status: "error", message: "Este evento ya no está disponible para registro.", availability: null };
      case "ticket_unavailable": {
        const { data: availability, error: refreshError } = await supabase.rpc("get_public_registration_event", { p_event_id: eventId });
        if (refreshError) {
          return { status: "error", message: "Esta entrada ya no está disponible. No pudimos actualizar las opciones; recarga la página para consultar el cupo actual." };
        }
        return {
          status: "error",
          message: availability ? "Esta entrada se agotó o ya no está disponible. Elige otra opción." : "Este evento ya no está disponible para registro.",
          availability: availability as PublicRegistrationEvent | null,
        };
      }
      case "invalid_input":
        return { status: "error", message: "Revisa tu nombre, email y tipo de entrada." };
      default:
        throw new Error("Unexpected registration result");
    }
  } catch {
    return { status: "error", message: "No pudimos confirmar tu registro. Intenta de nuevo; si ya se guardó, no se creará un duplicado." };
  }
}
