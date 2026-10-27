import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { privateTicketHeaders } from "@/lib/ticket";

export async function proxy(request: NextRequest) {
  // API handlers refresh cookies and normalize failures inside their boundary.
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next({ request });
  if (request.nextUrl.pathname === "/entradas" || request.nextUrl.pathname.startsWith("/entradas/")) {
    const response = NextResponse.next({ request });
    for (const [name, value] of Object.entries(privateTicketHeaders)) response.headers.set(name, value);
    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
