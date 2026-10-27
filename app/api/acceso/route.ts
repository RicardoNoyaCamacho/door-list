import { apiHandler, jsonBody, methodNotAllowed } from "@/lib/api";
import { signIn } from "@/lib/auth";

export const POST = apiHandler(async (request) => {
    await signIn(await jsonBody(request));
    return Response.json({ success: true }, { status: 200 });
});
export const GET = () => methodNotAllowed("POST");
export const PUT = () => methodNotAllowed("POST");
export const PATCH = () => methodNotAllowed("POST");
export const DELETE = () => methodNotAllowed("POST");
export const OPTIONS = () => methodNotAllowed("POST");
export const HEAD = () => methodNotAllowed("POST");
