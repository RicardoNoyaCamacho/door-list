import type { Metadata } from "next";
import Link from "next/link";
import { OrganizerForm } from "@/components/organizer-form";

export const metadata: Metadata = { title: "Panel del organizador | Door List", robots: { index: false, follow: false } };
export const instant = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f0e8] px-5 py-10 text-[#18231f] sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#18231f]/20 pb-6">
          <Link href="/dashboard" prefetch={false} className="text-sm font-semibold uppercase tracking-[0.18em]">Door List · Organizador</Link>
          <nav aria-label="Organizador" className="flex flex-wrap items-center gap-5 text-sm font-semibold">
            <Link href="/organizador" prefetch={false} className="underline">Gestionar eventos</Link>
            <OrganizerForm endpoint="/api/sesion" method="DELETE" signOut>
              <button className="border border-[#18231f] px-4 py-2">Cerrar sesión</button>
            </OrganizerForm>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
