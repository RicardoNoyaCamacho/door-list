import Link from "next/link";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f0e8] px-6 py-16 text-[#18231f]">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-[-8rem] h-80 w-80 rounded-full bg-[#ff6b4a]/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#89a88a]/35 blur-3xl"
      />

      <section className="relative w-full max-w-4xl border border-[#18231f]/15 bg-white/55 px-8 py-16 shadow-[0_24px_80px_rgba(24,35,31,0.12)] backdrop-blur-md sm:px-16 sm:py-24">
        <div className="flex flex-col items-start">
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#4f5d56]">
            Bienvenido
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-7xl md:text-8xl">
            Encuentro Creativo 2026
          </h1>

          <time
            className="mt-10 text-base font-medium tracking-wide text-[#4f5d56] sm:text-lg"
            dateTime="2026-11-14T19:00:00-06:00"
          >
            14 de noviembre de 2026 · 19:00 h
          </time>

          <address className="mt-2 text-base not-italic text-[#4f5d56] sm:text-lg">
            Museo Anahuacalli · Ciudad de México
          </address>

          <Link
            href="/acceso"
            className="mt-12 rounded-full bg-[#18231f] px-8 py-4 text-sm font-semibold tracking-wide text-white transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f] active:translate-y-0"
          >
            Acceso para organizadores
          </Link>
        </div>
      </section>
    </main>
  );
}
