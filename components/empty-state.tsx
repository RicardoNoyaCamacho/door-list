import type { ReactNode } from "react";

export function EmptyState({ title, description, children }: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" className="min-w-0 border border-[#18231f]/15 bg-white/65 p-6">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-[#4f5d56]">{description}</p>
      {children}
    </div>
  );
}
