import { revalidatePath } from "next/cache";
import { apiHandler, jsonBody, methodNotAllowed } from "@/lib/api";
import { updateEvent, deleteEvent } from "@/lib/organizer";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return apiHandler(async (request) => {
    const { eventId } = await context.params;
    await updateEvent(eventId, await jsonBody(request));
    revalidatePath("/organizador");
    return Response.json({ success: true });
  })(request);
}
export async function DELETE(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return apiHandler(async () => {
    const { eventId } = await context.params;
    await deleteEvent(eventId);
    revalidatePath("/organizador");
    return Response.json({ success: true });
  })(request);
}
export const GET = () => methodNotAllowed("PATCH, DELETE");
export const POST = () => methodNotAllowed("PATCH, DELETE");
export const PUT = () => methodNotAllowed("PATCH, DELETE");
export const OPTIONS = () => methodNotAllowed("PATCH, DELETE");
export const HEAD = () => methodNotAllowed("PATCH, DELETE");
