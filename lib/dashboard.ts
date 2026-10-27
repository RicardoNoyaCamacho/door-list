import { redirect } from "next/navigation";
import { organizerContext } from "./organizer";
import { ApiError } from "./api-errors";
import { mapDashboardEvent, mapOrganizerEvent } from "./supabase/mappers";
import { uuidPattern } from "./registration";

export const dashboardPageSize = 50;

export function dashboardPage(value: string | string[] | undefined) {
  const page = typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(page) && page <= Math.floor(2147483647 / dashboardPageSize) ? page : 1;
}

async function dashboardContext() {
  try { return await organizerContext(); }
  catch (error) {
    if (error instanceof ApiError && error.code === "unauthenticated") redirect("/acceso");
    throw error;
  }
}

export async function getDashboardEvents(page: number) {
  const { supabase, ownerId } = await dashboardContext();
  const offset = (page - 1) * dashboardPageSize;
  const { data, error, count } = await supabase.from("events")
    .select("id, title, description, starts_at, venue, capacity, status, ticket_types(id, name, capacity)", { count: "exact" })
    .eq("owner_id", ownerId)
    .order("starts_at", { ascending: false }).order("id")
    .range(offset, offset + dashboardPageSize - 1);
  if (error) throw new Error("Dashboard events unavailable");
  return { events: (data ?? []).map(mapOrganizerEvent), total: count ?? 0 };
}

export async function getDashboardEvent(eventId: string, page: number) {
  const { supabase } = await dashboardContext();
  if (!uuidPattern.test(eventId)) return null;
  const { data, error } = await supabase.rpc("get_organizer_event", {
    p_event_id: eventId, p_offset: (page - 1) * dashboardPageSize,
  });
  if (error) throw new Error("Dashboard event unavailable");
  return data ? mapDashboardEvent(data) : null;
}
