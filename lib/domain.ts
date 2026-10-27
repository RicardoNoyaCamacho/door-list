export type TicketType = { id: string; name: string; capacity: number };
export type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  venue: string;
  capacity: number;
  status: "draft" | "published";
  ticketTypes: TicketType[];
};
export type PublicEvent = Pick<Event, "id" | "title" | "description" | "startsAt" | "venue">;
export type PublicTicketType = Pick<TicketType, "id" | "name"> & { remaining: number };
export type PublicRegistrationEvent = PublicEvent & { ticketTypes: PublicTicketType[] };
export type TicketStatus = "valid" | "used" | "revoke";
export type PublicTicket = {
  code: string;
  status: TicketStatus;
  issuedAt: string;
  attendee: { name: string; email: string };
  event: Pick<Event, "title" | "venue" | "startsAt">;
  ticketType: Pick<TicketType, "name">;
};
export type RegistrationConfirmation = {
  eventTitle: string;
  ticketTypeName: string;
  ticketCode: string;
  emailStatus: "sent" | "failed";
};
export type RegistrationState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "ticketTypeId", string>>;
  availability?: PublicRegistrationEvent | null;
  confirmation?: RegistrationConfirmation;
};
export type RegistrationResult =
  | { code: "success"; eventTitle: string; ticketTypeName: string; ticketCode: string }
  | { code: "duplicate" | "eventUnavailable" | "ticketUnavailable" | "invalidInput" };
export type RegistrationInput = { name: string; email: string; ticketTypeId: string };
// Event writes accept CDMX datetime-local; event reads expose ISO instants.
export type EventInput = Pick<Event, "title" | "description" | "startsAt" | "venue" | "capacity" | "status">;
export type TicketTypeInput = Pick<TicketType, "name" | "capacity">;
export type CredentialsInput = { email: string; password: string };
export type ApiSuccess = { success: true };
export type Registration = {
  id: string;
  ticketTypeId: string;
  name: string;
  email: string;
  createdAt: string;
};
export type DashboardEvent = Omit<Event, "ticketTypes"> & {
  ticketTypes: (TicketType & { registrationCount: number })[];
  registrationCount: number;
  registrations: Registration[];
};
