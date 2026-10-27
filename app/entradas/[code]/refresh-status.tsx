"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefreshStatus() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="mt-4 border border-[#18231f]/30 px-3 py-2 text-sm font-semibold disabled:opacity-60" aria-live="polite">
      {pending ? "Consultando estado…" : "Actualizar estado"}
    </button>
  );
}
