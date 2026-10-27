import { createClient } from "@/lib/supabase/server";
import { mapPublicTicket, mapRegistrationEvent, mapRegistrationResult, registrationArguments } from "@/lib/supabase/mappers";
import { ApiError } from "@/lib/api-errors";
import { isTicketCode } from "@/lib/ticket";
import { sendTicketEmail } from "@/lib/ticket-email";
import { uuidPattern, validateRegistration } from "@/lib/registration";
import type { RegistrationConfirmation } from "./domain";

export async function registrationAvailability(eventId: string) {
  if (!uuidPattern.test(eventId)) throw new ApiError("eventUnavailable", 404);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_registration_event", { p_event_id: eventId });
  if (error) throw new ApiError("requestFailed", 500);
  if (!data) throw new ApiError("eventUnavailable", 404);
  return mapRegistrationEvent(data);
}

export async function registerAttendee(eventId: string, input: Record<string, unknown>): Promise<RegistrationConfirmation> {
  if (!uuidPattern.test(eventId)) throw new ApiError("eventUnavailable", 404);
  const { name, email, ticketTypeId, fieldErrors } = validateRegistration(input);
  if (Object.keys(fieldErrors).length) throw new ApiError("invalidInput", 400);
  const supabase = await createClient();
  const register = () => supabase.rpc("register_event_attendee", registrationArguments(eventId, ticketTypeId, name, email));
  let { data, error } = await register();
  // The RPC rolls back on deadlock; one fresh attempt cannot duplicate issuance.
  if (error?.code === "40P01") ({ data, error } = await register());
  if (error) throw new ApiError("requestFailed", 500);
  const result = mapRegistrationResult(data);
  switch (result.code) {
    case "duplicate": throw new ApiError("duplicateRegistration", 409);
    case "eventUnavailable": throw new ApiError("eventUnavailable", 404);
    case "ticketUnavailable": throw new ApiError("ticketUnavailable", 409);
    case "invalidInput": throw new ApiError("invalidInput", 400);
    case "success": {
      if (!isTicketCode(result.ticketCode)) throw new ApiError("requestFailed", 500);
      let emailStatus: "sent" | "failed" = "failed";
      try {
        const { data: ticket, error: ticketError } = await supabase.rpc("get_public_ticket", { p_code: result.ticketCode });
        if (ticketError || !ticket || ticket.code !== result.ticketCode) throw new Error("Missing ticket email details");
        await sendTicketEmail(mapPublicTicket(ticket), {
          apiKey: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM_EMAIL,
        });
        emailStatus = "sent";
      } catch {
        // Registration is committed; email failures must not trigger a retry.
        console.error("No se pudo enviar el email de confirmación de entrada.");
      }
      return { eventTitle: result.eventTitle, ticketTypeName: result.ticketTypeName, ticketCode: result.ticketCode, emailStatus };
    }
  }
}
