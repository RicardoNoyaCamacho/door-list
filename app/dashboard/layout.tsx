import { PageFrame } from "@/components/page-frame";
import { secondaryButton, textLink } from "@/lib/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { OrganizerForm } from "@/components/organizer-form";

export const metadata: Metadata = { title: "Panel del organizador | Door List", robots: { index: false, follow: false } };
export const instant = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageFrame>
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#18231f]/20 pb-6">
        <Link href="/dashboard" prefetch={false} className="break-words text-sm font-semibold uppercase tracking-[0.18em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f]">Door List · Organizador</Link>
        <nav aria-label="Organizador" className="flex flex-wrap items-center gap-5 text-sm font-semibold">
          <Link href="/organizador" prefetch={false} className={textLink}>Gestionar eventos</Link>
          <OrganizerForm endpoint="/api/sesion" method="DELETE" signOut>
            <button className={secondaryButton}>Cerrar sesión</button>
          </OrganizerForm>
        </nav>
      </header>
      {children}
    </PageFrame>
  );
}
