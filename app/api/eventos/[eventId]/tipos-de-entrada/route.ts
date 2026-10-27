import { revalidatePath } from "next/cache";
import { apiHandler, jsonBody, methodNotAllowed } from "@/lib/api";
import { createTicketType } from "@/lib/organizer";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return apiHandler(async (request) => {
    const { eventId } = await context.params;
    await createTicketType(eventId, await jsonBody(request));
    revalidatePath("/organizador");
    return Response.json({ success: true }, { status: 201 });
  })(request);
}
export const GET = () => methodNotAllowed("POST");
export const PUT = () => methodNotAllowed("POST");
export const PATCH = () => methodNotAllowed("POST");
export const DELETE = () => methodNotAllowed("POST");
export const OPTIONS = () => methodNotAllowed("POST");
export const HEAD = () => methodNotAllowed("POST");
