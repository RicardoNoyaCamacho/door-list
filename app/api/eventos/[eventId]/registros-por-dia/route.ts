import { apiHandler, methodNotAllowed } from "@/lib/api";
import { getDailyRegistrations } from "@/lib/registration-analytics";

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return apiHandler(async () => {
    const { eventId } = await context.params;
    return Response.json(await getDailyRegistrations(eventId));
  })(request);
}
export const POST = () => methodNotAllowed("GET");
export const PUT = () => methodNotAllowed("GET");
export const PATCH = () => methodNotAllowed("GET");
export const DELETE = () => methodNotAllowed("GET");
export const OPTIONS = () => methodNotAllowed("GET");
export const HEAD = () => methodNotAllowed("GET");
