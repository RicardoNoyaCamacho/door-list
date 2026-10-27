"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function positiveInteger(value: FormDataEntryValue | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function fail(message: string): never {
  redirect(`/organizador?error=${encodeURIComponent(message)}`);
}

async function organizerClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const ownerId = data?.claims?.sub;

  if (error || !ownerId) redirect("/acceso");
  return { supabase, ownerId };
}

async function eventCapacity(supabase: Awaited<ReturnType<typeof createClient>>, eventId: string) {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, capacity")
    .eq("id", eventId)
    .single();

  if (eventError || !event) fail("No tienes acceso a ese evento.");

  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from("ticket_types")
    .select("capacity")
    .eq("event_id", eventId);

  if (ticketTypesError) fail("No se pudieron consultar los tipos de entrada.");
  return { event, ticketTypeTotal: (ticketTypes ?? []).reduce((total, ticketType) => total + ticketType.capacity, 0) };
}

export async function createEvent(formData: FormData) {
  const { supabase, ownerId } = await organizerClient();
  const title = text(formData.get("title"));
  const venue = text(formData.get("venue"));
  const capacity = positiveInteger(formData.get("capacity"));
  const startsAt = text(formData.get("starts_at"));

  if (!title || !venue || !capacity || !startsAt) fail("Completa los campos obligatorios con valores válidos.");

  const { error } = await supabase.from("events").insert({
    owner_id: ownerId,
    title,
    venue,
    capacity,
    starts_at: new Date(startsAt).toISOString(),
    description: text(formData.get("description")),
    status: "draft",
  });

  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function updateEvent(formData: FormData) {
  const { supabase } = await organizerClient();
  const eventId = text(formData.get("event_id"));
  const title = text(formData.get("title"));
  const venue = text(formData.get("venue"));
  const capacity = positiveInteger(formData.get("capacity"));
  const startsAt = text(formData.get("starts_at"));
  const status = text(formData.get("status"));

  if (!eventId || !title || !venue || !capacity || !startsAt || !["draft", "published"].includes(status)) {
    fail("Revisa los datos del evento.");
  }

  const { ticketTypeTotal } = await eventCapacity(supabase, eventId);
  if (ticketTypeTotal > capacity) fail("El aforo del evento no puede ser menor que la suma de sus entradas.");
  if (status === "published" && ticketTypeTotal === 0) fail("Añade al menos un tipo de entrada antes de publicar.");

  const { error } = await supabase
    .from("events")
    .update({
      title,
      venue,
      capacity,
      starts_at: new Date(startsAt).toISOString(),
      description: text(formData.get("description")),
      status,
    })
    .eq("id", eventId);

  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await organizerClient();
  const eventId = text(formData.get("event_id"));
  if (!eventId) fail("Evento no válido.");

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function createTicketType(formData: FormData) {
  const { supabase } = await organizerClient();
  const eventId = text(formData.get("event_id"));
  const name = text(formData.get("name"));
  const capacity = positiveInteger(formData.get("capacity"));
  if (!eventId || !name || !capacity) fail("Revisa el nombre y aforo del tipo de entrada.");

  const { event, ticketTypeTotal } = await eventCapacity(supabase, eventId);
  if (ticketTypeTotal + capacity > event.capacity) {
    fail("La suma de los aforos de entrada no puede superar el aforo del evento.");
  }

  const { error } = await supabase.from("ticket_types").insert({ event_id: eventId, name, capacity });
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function updateTicketType(formData: FormData) {
  const { supabase } = await organizerClient();
  const ticketTypeId = text(formData.get("ticket_type_id"));
  const eventId = text(formData.get("event_id"));
  const name = text(formData.get("name"));
  const capacity = positiveInteger(formData.get("capacity"));
  if (!ticketTypeId || !eventId || !name || !capacity) fail("Revisa el tipo de entrada.");

  const { data: ticketType, error: ticketTypeError } = await supabase
    .from("ticket_types")
    .select("capacity")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .single();
  if (ticketTypeError || !ticketType) fail("No tienes acceso a ese tipo de entrada.");

  const { event, ticketTypeTotal } = await eventCapacity(supabase, eventId);
  if (ticketTypeTotal - ticketType.capacity + capacity > event.capacity) {
    fail("La suma de los aforos de entrada no puede superar el aforo del evento.");
  }

  const { error } = await supabase
    .from("ticket_types")
    .update({ name, capacity })
    .eq("id", ticketTypeId)
    .eq("event_id", eventId);
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function deleteTicketType(formData: FormData) {
  const { supabase } = await organizerClient();
  const ticketTypeId = text(formData.get("ticket_type_id"));
  if (!ticketTypeId) fail("Tipo de entrada no válido.");

  const { error } = await supabase.from("ticket_types").delete().eq("id", ticketTypeId);
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/acceso");
}
