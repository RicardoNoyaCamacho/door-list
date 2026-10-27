import { apiHandler, jsonBody, methodNotAllowed } from "@/lib/api";
import { registerAttendee } from "@/lib/registration-service";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return apiHandler(async (request) => {
    const { eventId } = await context.params;
    const confirmation = await registerAttendee(eventId, await jsonBody(request));
    return Response.json(confirmation, { status: 201 });
  })(request);
}
export const GET = () => methodNotAllowed("POST");
export const PUT = () => methodNotAllowed("POST");
export const PATCH = () => methodNotAllowed("POST");
export const DELETE = () => methodNotAllowed("POST");
export const OPTIONS = () => methodNotAllowed("POST");
export const HEAD = () => methodNotAllowed("POST");
