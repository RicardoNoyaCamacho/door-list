import { ApiError } from "./api-errors";

export function apiHandler(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)
        && request.headers.get("origin") !== new URL(request.url).origin) {
        throw new ApiError("forbidden", 403);
      }
      const response = await handler(request);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError("requestFailed", 500);
      return Response.json({ error: failure.code }, {
        status: failure.status, headers: { "Cache-Control": "private, no-store" },
      });
    }
  };
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError("unsupportedMediaType", 415);
  }
  let body: unknown;
  try { body = await request.json(); } catch { throw new ApiError("invalidInput", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("invalidInput", 400);
  return body as Record<string, unknown>;
}
export function methodNotAllowed(allow: string) {
  return Response.json({ error: "methodNotAllowed" }, {
    status: 405, headers: { "Cache-Control": "private, no-store", Allow: allow },
  });
}
