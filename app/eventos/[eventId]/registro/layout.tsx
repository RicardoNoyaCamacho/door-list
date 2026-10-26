import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/registration";

export const instant = false;

export default async function RegistrationLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  await connection();
  const { eventId } = await params;
  if (!uuidPattern.test(eventId)) notFound();

  // Check before the page's loading boundary can stream HTTP 200. The page
  // reads availability again so its loading and error boundaries remain useful.
  const result = await (async () => {
    const supabase = await createClient();
    return supabase.rpc("get_public_registration_event", { p_event_id: eventId });
  })().catch(() => null);
  if (result && !result.error && !result.data) notFound();
  // Let the page's error boundary handle connection/database failures.
  return children;
}
