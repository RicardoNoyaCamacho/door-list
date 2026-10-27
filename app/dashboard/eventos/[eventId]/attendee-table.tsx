import type { Registration } from "@/lib/domain";
import { formatEventDate } from "@/lib/dates.mjs";

type AttendeeTableState =
  | { status: "loading" }
  | { status: "ready"; registrations: Registration[]; total: number; ticketTypeNames: Map<string, string> };

export function AttendeeTable({ state }: { state: AttendeeTableState }) {
  return (
    <div aria-busy={state.status === "loading"}>
      {state.status === "loading" && <p role="status" className="mt-4 text-sm text-[#4f5d56]">Cargando asistentes…</p>}
      <div className="mt-5 overflow-x-auto border border-[#18231f]/15 bg-white/65">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Lista de asistentes, tipo de entrada y fecha de registro en hora de Ciudad de México</caption>
          <thead className="border-b border-[#18231f]/15"><tr>
            <th scope="col" className="px-5 py-4">Nombre</th><th scope="col" className="px-5 py-4">Correo electrónico</th>
            <th scope="col" className="px-5 py-4">Tipo de entrada</th><th scope="col" className="px-5 py-4">Fecha de registro</th>
          </tr></thead>
          <tbody>{state.status === "loading" ? (
            [0, 1, 2].map((row) => (
              <tr key={row} aria-hidden="true" className="border-b border-[#18231f]/10 last:border-0">
                {[0, 1, 2, 3].map((column) => <td key={column} className="px-5 py-4"><div className="h-4 w-32 bg-[#18231f]/10" /></td>)}
              </tr>
            ))
          ) : state.registrations.length === 0 ? (
            <tr><td colSpan={4} className="px-5 py-10 text-center">
              <p role="status" className="font-semibold">{state.total === 0 ? "Aún no hay asistentes" : "No hay asistentes en esta página"}</p>
              <p className="mt-2 text-[#4f5d56]">{state.total === 0 ? "Los registros confirmados aparecerán aquí." : "Usa la paginación para consultar los registros anteriores."}</p>
            </td></tr>
          ) : state.registrations.map((registration) => (
            <tr key={registration.id} className="border-b border-[#18231f]/10 last:border-0">
              <td className="max-w-xs break-words px-5 py-4">{registration.name}</td>
              <td className="max-w-xs break-words px-5 py-4">{registration.email}</td>
              <td className="max-w-xs break-words px-5 py-4">{state.ticketTypeNames.get(registration.ticketTypeId)}</td>
              <td className="px-5 py-4"><time dateTime={registration.createdAt}>{formatEventDate(registration.createdAt)}</time></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
