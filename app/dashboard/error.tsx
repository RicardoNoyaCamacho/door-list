"use client";

import { errorNotice, pageTitle, primaryButton } from "@/lib/ui";

export default function DashboardError({ retry }: { retry: () => void }) {
  return <section className="mt-10">
    <h1 className={pageTitle}>No pudimos cargar el panel</h1>
    <p role="alert" className={`mt-4 ${errorNotice}`}>No pudimos cargar tus eventos y registros. Intenta de nuevo.</p>
    <button onClick={() => retry()} className={`mt-5 ${primaryButton}`}>Volver a intentar</button>
  </section>;
}
