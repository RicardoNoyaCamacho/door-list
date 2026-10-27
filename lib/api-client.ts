import { ApiError, errorMessages } from "./api-errors";

export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store" });
  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { throw new ApiError("requestFailed", response.status); }
    const code = body && typeof body === "object" && "error" in body ? body.error : undefined;
    const error = typeof code === "string" && Object.hasOwn(errorMessages, code)
      ? code as keyof typeof errorMessages : "requestFailed";
    throw new ApiError(error, response.status);
  }
  return response.json() as Promise<T>;
}
export function jsonRequest(body: unknown, method = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
