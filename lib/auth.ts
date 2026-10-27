import { createClient } from "./supabase/server";
import { ApiError } from "./api-errors";
import type { CredentialsInput } from "./domain";

export function credentials(body: Record<string, unknown>): CredentialsInput {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) throw new ApiError("invalidInput", 400);
  return { email, password };
}
function authError(error: { code?: string; status?: number }): never {
  if (error.status === 429) throw new ApiError("rateLimited", 429);
  switch (error.code) {
    case "invalid_credentials": throw new ApiError("invalidCredentials", 401);
    case "email_not_confirmed": throw new ApiError("emailNotConfirmed", 403);
    case "user_already_exists": case "email_exists": throw new ApiError("accountExists", 409);
    case "signup_disabled": throw new ApiError("signupUnavailable", 403);
    case "weak_password": case "validation_failed": throw new ApiError("invalidInput", 400);
    default: throw new ApiError("requestFailed", 500);
  }
}
export async function signIn(body: Record<string, unknown>) {
  const input = credentials(body);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) authError(error);
}
export async function signUp(body: Record<string, unknown>) {
  const input = credentials(body);
  if (input.password.length < 6) throw new ApiError("invalidInput", 400);
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(input);
  if (error) authError(error);
}
export async function signOut() {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims?.sub) throw new ApiError("unauthenticated", 401);
  const { error } = await supabase.auth.signOut();
  if (error) authError(error);
}
