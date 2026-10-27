import Link from "next/link";

export default function DashboardNotFound() {
  return <section className="py-12">
    <h1 className="text-3xl font-semibold">Evento no disponible</h1>
    <p className="mt-4">El evento no existe o no tienes acceso a su panel.</p>
    <Link href="/dashboard" prefetch={false} className="mt-6 inline-block font-semibold underline">Volver a tus eventos</Link>
  </section>;
}
