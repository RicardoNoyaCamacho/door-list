import type { ReactNode } from "react";

export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f0e8] px-5 py-10 text-[#18231f] sm:px-10">
      <div className="mx-auto max-w-6xl min-w-0">{children}</div>
    </main>
  );
}
