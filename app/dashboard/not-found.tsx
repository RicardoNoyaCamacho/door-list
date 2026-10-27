import { pageTitle, textLink } from "@/lib/ui";
import Link from "next/link";

export default function DashboardNotFound() {
  return <section className="mt-10">
    <h1 className={pageTitle}>Evento no disponible</h1>
    <p className="mt-4 text-[#4f5d56]">El evento no existe o no tienes acceso a su panel.</p>
    <Link href="/dashboard" prefetch={false} className={`mt-5 inline-block ${textLink}`}>Volver a tus eventos</Link>
  </section>;
}
