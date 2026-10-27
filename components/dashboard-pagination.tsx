import { textLink } from "@/lib/ui";
import Link from "next/link";
import { dashboardPageSize } from "@/lib/dashboard";

export function DashboardPagination({ pathname, page, total }: { pathname: string; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / dashboardPageSize));
  if (pages === 1 && page === 1) return null;
  return (
    <nav aria-label="Paginación" className="mt-6 flex flex-wrap items-center gap-5 text-sm">
      {page > 1 && <Link href={`${pathname}?pagina=${page - 1}`} prefetch={false} className={textLink}>Anterior</Link>}
      <p>Página {page} · {total} en total</p>
      {page < pages && <Link href={`${pathname}?pagina=${page + 1}`} prefetch={false} className={textLink}>Siguiente</Link>}
    </nav>
  );
}
