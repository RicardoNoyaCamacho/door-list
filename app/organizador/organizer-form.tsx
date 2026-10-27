"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { jsonRequest, requestJson } from "@/lib/api-client";
import { ApiError, errorMessage } from "@/lib/api-errors";
import type { ApiSuccess } from "@/lib/domain";

export function OrganizerForm({ endpoint, method = "POST", children, className, signOut = false }: {
  endpoint: string; method?: "POST" | "PATCH" | "DELETE"; children: ReactNode; className?: string; signOut?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    if ("capacity" in body) Object.assign(body, { capacity: Number(body.capacity) });
    setPending(true);
    setMessage("");
    try {
      const url = endpoint.replace(":eventId", encodeURIComponent(String(body.eventId ?? "")));
      await requestJson<ApiSuccess>(url, jsonRequest(body, method));
      if (signOut) router.replace("/acceso");
      else { if (method === "POST") form.reset(); router.refresh(); }
    } catch (error) {
      setMessage(error instanceof ApiError ? errorMessage(error.code) : errorMessage("networkError"));
    } finally { setPending(false); }
  }
  return <form onSubmit={submit} className={className} aria-busy={pending}>
    <fieldset disabled={pending} className="contents">{children}</fieldset>
    {message && <p role="alert" className="text-sm text-[#b7452b]">{message}</p>}
  </form>;
}
