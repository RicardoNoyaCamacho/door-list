import { createClient } from "./supabase/server";
import { eventWrite, ticketTypeWrite } from "./supabase/mappers";
import { ApiError, databaseError } from "./api-errors";
import { eventDateTimeToIso } from "./dates.mjs";
import { uuidPattern } from "./registration";
import type { EventInput, TicketTypeInput } from "./domain";

type Client = Awaited<ReturnType<typeof createClient>>;
export async function organizerContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const ownerId = data?.claims?.sub;
  if (error || !ownerId) throw new ApiError("unauthenticated", 401);
  return { supabase, ownerId };
}
function identifier(id: string) {
  if (!uuidPattern.test(id)) throw new ApiError("invalidInput", 400);
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function positiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
    throw new ApiError("invalidInput", 400);
  }
  return value;
}
function eventInput(body: Record<string, unknown>, creating: boolean): EventInput {
  const title = text(body.title), venue = text(body.venue);
  const capacity = positiveInteger(body.capacity);
  const status = creating ? "draft" : body.status;
  if (!title || !venue || (status !== "draft" && status !== "published")
    || typeof body.description !== "string") throw new ApiError("invalidInput", 400);
  let startsAt: string;
  try { startsAt = eventDateTimeToIso(text(body.startsAt)); }
  catch { throw new ApiError("invalidDate", 400); }
  return { title, venue, capacity, status, startsAt, description: text(body.description) };
}
function ticketTypeInput(body: Record<string, unknown>): TicketTypeInput {
  const name = text(body.name), capacity = positiveInteger(body.capacity);
  if (!name) throw new ApiError("invalidInput", 400);
  return { name, capacity };
}
async function ownedEvent(supabase: Client, ownerId: string, eventId: string) {
  identifier(eventId);
  const { data, error } = await supabase.from("events").select("id, capacity")
    .eq("id", eventId).eq("owner_id", ownerId).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError("forbidden", 403);
  return data;
}
async function assignedCapacity(supabase: Client, eventId: string) {
  const { data, error } = await supabase.from("ticket_types").select("capacity").eq("event_id", eventId);
  if (error) databaseError(error);
  return (data ?? []).reduce((sum, ticketType) => sum + ticketType.capacity, 0);
}
export async function createEvent(body: Record<string, unknown>) {
  const { supabase, ownerId } = await organizerContext();
  const input = eventInput(body, true);
  const { error } = await supabase.from("events").insert(eventWrite(input, ownerId));
  if (error) databaseError(error);
}
export async function updateEvent(eventId: string, body: Record<string, unknown>) {
  const { supabase, ownerId } = await organizerContext();
  await ownedEvent(supabase, ownerId, eventId);
  const input = eventInput(body, false);
  const total = await assignedCapacity(supabase, eventId);
  if (total > input.capacity) throw new ApiError("eventCapacityExceeded", 409);
  if (input.status === "published" && total === 0) throw new ApiError("ticketTypesRequired", 409);
  const { data, error } = await supabase.from("events").update(eventWrite(input))
    .eq("id", eventId).eq("owner_id", ownerId).select("id").maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError("forbidden", 403);
}
export async function deleteEvent(eventId: string) {
  const { supabase, ownerId } = await organizerContext();
  await ownedEvent(supabase, ownerId, eventId);
  const { data, error } = await supabase.from("events").delete()
    .eq("id", eventId).eq("owner_id", ownerId).select("id").maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError("forbidden", 403);
}
export async function createTicketType(eventId: string, body: Record<string, unknown>) {
  const { supabase, ownerId } = await organizerContext();
  const event = await ownedEvent(supabase, ownerId, eventId);
  const input = ticketTypeInput(body);
  if (await assignedCapacity(supabase, eventId) + input.capacity > event.capacity) {
    throw new ApiError("eventCapacityExceeded", 409);
  }
  const { error } = await supabase.from("ticket_types").insert(ticketTypeWrite(eventId, input.name, input.capacity));
  if (error) databaseError(error);
}
async function ownedTicketType(supabase: Client, eventId: string, ticketTypeId: string) {
  identifier(ticketTypeId);
  const { data, error } = await supabase.from("ticket_types").select("id, capacity")
    .eq("id", ticketTypeId).eq("event_id", eventId).maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError("forbidden", 403);
  return data;
}
export async function updateTicketType(eventId: string, ticketTypeId: string, body: Record<string, unknown>) {
  const { supabase, ownerId } = await organizerContext();
  const event = await ownedEvent(supabase, ownerId, eventId);
  const ticketType = await ownedTicketType(supabase, eventId, ticketTypeId);
  const input = ticketTypeInput(body);
  if (await assignedCapacity(supabase, eventId) - ticketType.capacity + input.capacity > event.capacity) {
    throw new ApiError("eventCapacityExceeded", 409);
  }
  const { data, error } = await supabase.from("ticket_types").update(input)
    .eq("id", ticketTypeId).eq("event_id", eventId).select("id").maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError("forbidden", 403);
}
export async function deleteTicketType(eventId: string, ticketTypeId: string) {
  const { supabase, ownerId } = await organizerContext();
  await ownedEvent(supabase, ownerId, eventId);
  await ownedTicketType(supabase, eventId, ticketTypeId);
  const { data, error } = await supabase.from("ticket_types").delete()
    .eq("id", ticketTypeId).eq("event_id", eventId).select("id").maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ApiError("forbidden", 403);
}
