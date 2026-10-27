import type { Event, PublicEvent, PublicRegistrationEvent, PublicTicket, RegistrationResult } from "../domain";

type EventRow = Omit<PublicEvent, "startsAt"> & { starts_at: string };
type OrganizerEventRow = EventRow & Pick<Event, "capacity" | "status"> & { ticket_types: Event["ticketTypes"] };
type RegistrationEventRow = EventRow & { ticket_types: PublicRegistrationEvent["ticketTypes"] };
type TicketRow = Omit<PublicTicket, "issuedAt" | "event" | "ticketType"> & {
  issued_at: string;
  event: Omit<PublicTicket["event"], "startsAt"> & { starts_at: string };
  ticket_type: PublicTicket["ticketType"];
};
type RegistrationRow = { code: string; event_title?: string; ticket_type_name?: string; ticket_code?: string };

export function mapPublicEvent(row: EventRow): PublicEvent {
  return { id: row.id, title: row.title, description: row.description, startsAt: row.starts_at, venue: row.venue };
}
export function mapOrganizerEvent(row: OrganizerEventRow): Event {
  return { ...mapPublicEvent(row), capacity: row.capacity, status: row.status, ticketTypes: row.ticket_types };
}
export function mapRegistrationEvent(row: RegistrationEventRow): PublicRegistrationEvent {
  return { ...mapPublicEvent(row), ticketTypes: row.ticket_types };
}
export function mapPublicTicket(row: TicketRow): PublicTicket {
  return {
    code: row.code, status: row.status, issuedAt: row.issued_at, attendee: row.attendee,
    event: { title: row.event.title, venue: row.event.venue, startsAt: row.event.starts_at },
    ticketType: row.ticket_type,
  };
}
export function mapRegistrationResult(row: RegistrationRow): RegistrationResult {
  if (row.code === "success" && row.event_title && row.ticket_type_name && row.ticket_code) {
    return { code: "success", eventTitle: row.event_title, ticketTypeName: row.ticket_type_name, ticketCode: row.ticket_code };
  }
  const codes = { duplicate: "duplicate", event_unavailable: "eventUnavailable", ticket_unavailable: "ticketUnavailable", invalid_input: "invalidInput" } as const;
  const code = codes[row.code as keyof typeof codes];
  if (!code) throw new Error("Unexpected registration result");
  return { code };
}
export function eventWrite(input: { title: string; venue: string; capacity: number; startsAt: string; description: string; status: string }, ownerId?: string) {
  return {
    title: input.title, venue: input.venue, capacity: input.capacity, starts_at: input.startsAt,
    description: input.description, status: input.status, ...(ownerId ? { owner_id: ownerId } : {}),
  };
}
export function ticketTypeWrite(eventId: string, name: string, capacity: number) {
  return { event_id: eventId, name, capacity };
}
export function registrationArguments(eventId: string, ticketTypeId: string, name: string, email: string) {
  return { p_event_id: eventId, p_ticket_type_id: ticketTypeId, p_name: name, p_email: email };
}
