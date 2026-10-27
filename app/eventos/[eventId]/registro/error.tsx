"use client";

import { PageFrame } from "@/components/page-frame";
import { errorNotice, pageTitle, primaryButton } from "@/lib/ui";

export default function RegistrationError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <section>
        <h1 className={pageTitle}>No pudimos cargar el evento</h1>
        <p role="alert" className={`mt-4 ${errorNotice}`}>No pudimos cargar el evento y sus entradas. Intenta de nuevo.</p>
        <button onClick={() => retry()} className={`mt-5 ${primaryButton}`}>Volver a intentar</button>
      </section>
    </PageFrame>
  );
}
