"use client";

export default function RegistrationError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#f5f0e8] px-6 py-16 text-[#18231f]">
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">No pudimos cargar el evento.</h1>
        <p role="alert" className="mt-4">Revisa tu conexión e intenta de nuevo.</p>
        <button onClick={reset} className="mt-6 bg-[#18231f] px-5 py-3 font-semibold text-white">Volver a intentar</button>
      </section>
    </main>
  );
}
