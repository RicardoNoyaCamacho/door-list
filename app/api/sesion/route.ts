import { apiHandler, methodNotAllowed } from "@/lib/api";
import { signOut } from "@/lib/auth";

export const DELETE = apiHandler(async () => {
    await signOut();
    return Response.json({ success: true });
});
export const GET = () => methodNotAllowed("DELETE");
export const POST = () => methodNotAllowed("DELETE");
export const PUT = () => methodNotAllowed("DELETE");
export const PATCH = () => methodNotAllowed("DELETE");
export const OPTIONS = () => methodNotAllowed("DELETE");
export const HEAD = () => methodNotAllowed("DELETE");
