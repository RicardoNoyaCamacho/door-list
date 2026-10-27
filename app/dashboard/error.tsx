"use client";

export default function DashboardError({ retry }: { retry: () => void }) {
  return <section className="py-12">
    <h1 className="text-3xl font-semibold">No pudimos cargar el panel</h1>
    <p role="alert" className="mt-4">Intenta de nuevo en unos momentos.</p>
    <button onClick={retry} className="mt-6 bg-[#18231f] px-5 py-3 font-semibold text-white">Volver a intentar</button>
  </section>;
}
