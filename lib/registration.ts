export type PublicTicketType = { id: string; name: string; remaining: number };

export type PublicRegistrationEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  venue: string;
  ticket_types: PublicTicketType[];
};

export type RegistrationState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "ticket_type_id", string>>;
  availability?: PublicRegistrationEvent | null;
  confirmation?: { eventTitle: string; ticketName: string; ticketCode: string };
};

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateRegistration(formData: FormData) {
  const value = (key: string) => {
    const entry = formData.get(key);
    return typeof entry === "string" ? entry.trim() : "";
  };
  const name = value("name");
  const email = value("email").toLowerCase();
  const ticketTypeId = value("ticket_type_id");
  const fieldErrors: NonNullable<RegistrationState["fieldErrors"]> = {};

  if (!name || Array.from(name).length > 200) fieldErrors.name = "Ingresa un nombre de hasta 200 caracteres.";
  if (Array.from(email).length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Ingresa un email válido de hasta 254 caracteres.";
  }
  if (!uuidPattern.test(ticketTypeId)) fieldErrors.ticket_type_id = "Selecciona un tipo de entrada.";

  return { name, email, ticketTypeId, fieldErrors };
}
