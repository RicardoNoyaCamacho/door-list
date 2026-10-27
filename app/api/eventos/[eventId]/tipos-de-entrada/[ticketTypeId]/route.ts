import { revalidatePath } from "next/cache";
import { apiHandler, jsonBody, methodNotAllowed } from "@/lib/api";
import { updateTicketType, deleteTicketType } from "@/lib/organizer";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; ticketTypeId: string }> }) {
  return apiHandler(async (request) => {
    const { eventId, ticketTypeId } = await context.params;
    await updateTicketType(eventId, ticketTypeId, await jsonBody(request));
    revalidatePath("/organizador");
    return Response.json({ success: true });
  })(request);
}
export async function DELETE(request: Request, context: { params: Promise<{ eventId: string; ticketTypeId: string }> }) {
  return apiHandler(async () => {
    const { eventId, ticketTypeId } = await context.params;
    await deleteTicketType(eventId, ticketTypeId);
    revalidatePath("/organizador");
    return Response.json({ success: true });
  })(request);
}
export const GET = () => methodNotAllowed("PATCH, DELETE");
export const POST = () => methodNotAllowed("PATCH, DELETE");
export const PUT = () => methodNotAllowed("PATCH, DELETE");
export const OPTIONS = () => methodNotAllowed("PATCH, DELETE");
export const HEAD = () => methodNotAllowed("PATCH, DELETE");
