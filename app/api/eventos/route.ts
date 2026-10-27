import { revalidatePath } from "next/cache";
import { apiHandler, jsonBody, methodNotAllowed } from "@/lib/api";
import { createEvent } from "@/lib/organizer";

export const POST = apiHandler(async (request) => {
    await createEvent(await jsonBody(request));
    revalidatePath("/organizador");
    return Response.json({ success: true }, { status: 201 });
});
export const GET = () => methodNotAllowed("POST");
export const PUT = () => methodNotAllowed("POST");
export const PATCH = () => methodNotAllowed("POST");
export const DELETE = () => methodNotAllowed("POST");
export const OPTIONS = () => methodNotAllowed("POST");
export const HEAD = () => methodNotAllowed("POST");
