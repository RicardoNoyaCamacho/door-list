import { organizerContext } from "./organizer";
import { ApiError, databaseError } from "./api-errors";
import { uuidPattern } from "./registration";
import type { DailyRegistrations } from "./domain";

export async function getDailyRegistrations(eventId: string): Promise<DailyRegistrations> {
  const { supabase } = await organizerContext();
  if (!uuidPattern.test(eventId)) throw new ApiError("invalidInput", 400);
  const { data, error } = await supabase.rpc("get_event_daily_registrations", { p_event_id: eventId });
  if (error) databaseError(error);
  if (!data) throw new ApiError("forbidden", 403);
  return {
    publishedAt: data.published_at,
    publishedAtEstimated: data.published_at_estimated,
    days: data.days.map((day: { date: string; registration_count: number }) => ({
      date: day.date, registrationCount: day.registration_count,
    })),
  };
}
