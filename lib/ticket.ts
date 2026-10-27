import type { TicketStatus } from "./domain";
export type { TicketStatus, PublicTicket } from "./domain";

export function isTicketCode(value: unknown): value is string {
  return typeof value === "string" && value.length === 64 && /^[0-9a-f]{64}$/.test(value);
}

export function ticketPath(code: string) {
  if (!isTicketCode(code)) throw new Error("Código de entrada no válido.");
  return `/entradas/${code}`;
}

export const ticketStatusDetails: Record<TicketStatus, { label: string; description: string }> = {
  valid: { label: "Válida", description: "Tu entrada está válida. Presenta este QR al llegar al evento." },
  used: { label: "Utilizada", description: "Esta entrada ya fue utilizada y no permite otro acceso." },
  revoke: { label: "Revocada", description: "Esta entrada fue revocada y no permite el acceso al evento." },
};

export const privateTicketHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
