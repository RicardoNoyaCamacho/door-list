"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccessPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const supabase = createClient();
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setPending(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "sign-in") router.push("/organizador");
    else setMessage("Revisa tu correo para confirmar la cuenta y después inicia sesión.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] px-6 text-[#18231f]">
      <section className="w-full max-w-md border border-[#18231f]/15 bg-white/65 p-8 shadow-[0_24px_80px_rgba(24,35,31,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f5d56]">Organizadores</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">{mode === "sign-in" ? "Inicia sesión" : "Crea tu cuenta"}</h1>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium">Correo electrónico<input name="email" type="email" required className="mt-1 w-full border border-[#18231f]/20 bg-white px-3 py-2 outline-none focus:border-[#18231f]" /></label>
          <label className="block text-sm font-medium">Contraseña<input name="password" type="password" minLength={6} required className="mt-1 w-full border border-[#18231f]/20 bg-white px-3 py-2 outline-none focus:border-[#18231f]" /></label>
          {message && <p role="status" className="text-sm text-[#4f5d56]">{message}</p>}
          <button disabled={pending} className="w-full bg-[#18231f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Procesando…" : mode === "sign-in" ? "Entrar" : "Crear cuenta"}</button>
        </form>
        <button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }} className="mt-5 text-sm font-semibold underline">{mode === "sign-in" ? "Crear una cuenta" : "Ya tengo una cuenta"}</button>
      </section>
    </main>
  );
}
