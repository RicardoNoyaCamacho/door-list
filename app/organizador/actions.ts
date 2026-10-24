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
    .from("event")
    .select("id, capacity")
    .eq("id", eventId)
    .single();

  if (eventError || !event) fail("No tienes acceso a ese evento.");

  const { data: tickets, error: ticketsError } = await supabase
    .from("ticket_types")
    .select("capacity")
    .eq("event_id", eventId);

  if (ticketsError) fail("No se pudieron consultar los tipos de entrada.");
  return { event, ticketTotal: (tickets ?? []).reduce((total, ticket) => total + ticket.capacity, 0) };
}

export async function createEvent(formData: FormData) {
  const { supabase, ownerId } = await organizerClient();
  const title = text(formData.get("title"));
  const venue = text(formData.get("venue"));
  const capacity = positiveInteger(formData.get("capacity"));
  const startsAt = text(formData.get("starts_at"));

  if (!title || !venue || !capacity || !startsAt) fail("Completa los campos obligatorios con valores válidos.");

  const { error } = await supabase.from("event").insert({
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

  const { ticketTotal } = await eventCapacity(supabase, eventId);
  if (ticketTotal > capacity) fail("El aforo del evento no puede ser menor que la suma de sus entradas.");
  if (status === "published" && ticketTotal === 0) fail("Añade al menos un tipo de entrada antes de publicar.");

  const { error } = await supabase
    .from("event")
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

  const { error } = await supabase.from("event").delete().eq("id", eventId);
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function createTicketType(formData: FormData) {
  const { supabase } = await organizerClient();
  const eventId = text(formData.get("event_id"));
  const name = text(formData.get("name"));
  const capacity = positiveInteger(formData.get("capacity"));
  if (!eventId || !name || !capacity) fail("Revisa el nombre y aforo del tipo de entrada.");

  const { event, ticketTotal } = await eventCapacity(supabase, eventId);
  if (ticketTotal + capacity > event.capacity) {
    fail("La suma de los aforos de entrada no puede superar el aforo del evento.");
  }

  const { error } = await supabase.from("ticket_types").insert({ event_id: eventId, name, capacity });
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function updateTicketType(formData: FormData) {
  const { supabase } = await organizerClient();
  const ticketId = text(formData.get("ticket_id"));
  const eventId = text(formData.get("event_id"));
  const name = text(formData.get("name"));
  const capacity = positiveInteger(formData.get("capacity"));
  if (!ticketId || !eventId || !name || !capacity) fail("Revisa el tipo de entrada.");

  const { data: ticket, error: ticketError } = await supabase
    .from("ticket_types")
    .select("capacity")
    .eq("id", ticketId)
    .eq("event_id", eventId)
    .single();
  if (ticketError || !ticket) fail("No tienes acceso a ese tipo de entrada.");

  const { event, ticketTotal } = await eventCapacity(supabase, eventId);
  if (ticketTotal - ticket.capacity + capacity > event.capacity) {
    fail("La suma de los aforos de entrada no puede superar el aforo del evento.");
  }

  const { error } = await supabase
    .from("ticket_types")
    .update({ name, capacity })
    .eq("id", ticketId)
    .eq("event_id", eventId);
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function deleteTicketType(formData: FormData) {
  const { supabase } = await organizerClient();
  const ticketId = text(formData.get("ticket_id"));
  if (!ticketId) fail("Tipo de entrada no válido.");

  const { error } = await supabase.from("ticket_types").delete().eq("id", ticketId);
  if (error) fail(error.message);
  revalidatePath("/organizador");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/acceso");
}
