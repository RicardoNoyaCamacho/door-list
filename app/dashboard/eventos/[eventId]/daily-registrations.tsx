"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/api-client";
import type { DailyRegistrations } from "@/lib/domain";
import { secondaryButton } from "@/lib/ui";
import { DailyRegistrationChart } from "./daily-registration-chart";

type ChartState = { status: "loading" } | { status: "error" } | { status: "ready"; data: DailyRegistrations };

export function EventDailyRegistrations({ eventId }: { eventId: string }) {
  const [state, setState] = useState<ChartState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    requestJson<DailyRegistrations>(`/api/eventos/${eventId}/registros-por-dia`, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setState({ status: "ready", data }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: "error" }); });
    return () => controller.abort();
  }, [eventId, attempt]);
  return (
    <section className="mt-10 min-w-0" aria-labelledby="daily-registrations-heading" aria-busy={state.status === "loading"}>
      <h2 id="daily-registrations-heading" className="text-2xl font-semibold">Registros por día</h2>
      <p className="mt-4 text-[#4f5d56]">Desde la primera publicación del evento hasta hoy.</p>
      {state.status === "loading" && <div className="mt-5 min-h-80 border border-[#18231f]/15 bg-white/65 p-6"><p role="status" className="text-sm text-[#4f5d56]">Cargando registros por día…</p></div>}
      {state.status === "error" && <div className="mt-5 border border-[#b7452b] bg-[#ff6b4a]/10 p-6"><p role="alert" className="text-[#b7452b]">No pudimos cargar los registros por día. Intenta de nuevo.</p><button type="button" className={`mt-4 ${secondaryButton}`} onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>Volver a intentar</button></div>}
      {state.status === "ready" && <DailyRegistrationChart data={state.data} />}
    </section>
  );
}
