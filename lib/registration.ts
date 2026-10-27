import type { RegistrationState } from "./domain";
export type { PublicTicketType, PublicRegistrationEvent, RegistrationState } from "./domain";

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateRegistration(input: Record<string, unknown>) {
  const value = (key: string) => {
    const entry = input[key];
    return typeof entry === "string" ? entry.trim() : "";
  };
  const name = value("name");
  const email = value("email").toLowerCase();
  const ticketTypeId = value("ticketTypeId");
  const fieldErrors: NonNullable<RegistrationState["fieldErrors"]> = {};

  if (!name || Array.from(name).length > 200) fieldErrors.name = "Ingresa un nombre de hasta 200 caracteres.";
  if (Array.from(email).length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Ingresa un email válido de hasta 254 caracteres.";
  }
  if (!uuidPattern.test(ticketTypeId)) fieldErrors.ticketTypeId = "Selecciona un tipo de entrada.";

  return { name, email, ticketTypeId, fieldErrors };
}
