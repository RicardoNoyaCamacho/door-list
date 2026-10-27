import type { DailyRegistrations } from "@/lib/domain";
import { formatChartDate } from "@/lib/dates.mjs";

export function DailyRegistrationChart({ data }: { data: DailyRegistrations }) {
  if (!data.publishedAt) return (
    <div className="mt-5 border border-[#18231f]/15 bg-white/65 p-6">
      <p className="font-semibold">El evento aún no se ha publicado</p>
      <p className="mt-2 text-sm text-[#4f5d56]">La gráfica estará disponible desde su primera publicación.</p>
    </div>
  );
  const { days } = data;
  const total = days.reduce((sum, day) => sum + day.registrationCount, 0);
  const maximum = Math.max(1, ...days.map((day) => day.registrationCount));
  const x = (index: number) => days.length === 1 ? 380 : 60 + index * 640 / Math.max(1, days.length - 1);
  const y = (count: number) => 220 - count * 180 / maximum;
  const points = days.map((day, index) => `${x(index)},${y(day.registrationCount)}`).join(" ");
  const labelIndexes = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])].filter((index) => index >= 0);
  return (
    <div className="mt-5 min-w-0 border border-[#18231f]/15 bg-white/65 p-6">
      <p className="text-lg font-semibold">{total} registros en el período</p>
      <p className="mt-2 text-sm text-[#4f5d56]">Hora de Ciudad de México · Incluye días sin registros.</p>
      {data.publishedAtEstimated && <p className="mt-2 text-sm text-[#4f5d56]">La fecha de publicación es estimada: se usa el primer registro conocido o, si no hay registros, la creación del evento.</p>}
      {total === 0 && <p role="status" className="mt-4 text-sm">Aún no hay registros. Los registros confirmados aparecerán aquí.</p>}
      <div className="mt-5 overflow-x-auto">
        <svg viewBox="0 0 760 280" className="min-w-[520px] w-full text-[#18231f]" role="img" aria-labelledby="daily-chart-title daily-chart-description">
          <title id="daily-chart-title">Registros por día</title>
          <desc id="daily-chart-description">{total} registros desde la publicación hasta hoy. Consulta los valores exactos en Ver datos por día.</desc>
          {[0, maximum].map((count) => (
            <g key={count}>
              <line x1="60" x2="700" y1={y(count)} y2={y(count)} stroke="currentColor" strokeOpacity="0.1" />
              <text x="48" y={y(count) + 4} textAnchor="end" fill="#4f5d56" fontSize="14">{count}</text>
            </g>
          ))}
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          {days.length === 1 && <circle cx={x(0)} cy={y(days[0].registrationCount)} r="4" fill="currentColor" />}
          {labelIndexes.map((index) => (
            <text key={days[index].date} x={x(index)} y="254" textAnchor={days.length === 1 ? "middle" : index === 0 ? "start" : index === days.length - 1 ? "end" : "middle"} fill="#4f5d56" fontSize="14">{formatChartDate(days[index].date)}</text>
          ))}
        </svg>
      </div>
      <details className="mt-4 text-sm">
        <summary className="w-fit cursor-pointer font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f]">Ver datos por día</summary>
        <div className="mt-5 max-h-80 overflow-auto border border-[#18231f]/15">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Registros diarios en hora de Ciudad de México</caption>
            <thead className="border-b border-[#18231f]/15"><tr><th scope="col" className="px-5 py-4">Día</th><th scope="col" className="px-5 py-4">Registros</th></tr></thead>
            <tbody>{days.map((day) => <tr key={day.date} className="border-b border-[#18231f]/10 last:border-0"><td className="px-5 py-4"><time dateTime={day.date}>{formatChartDate(day.date)}</time></td><td className="px-5 py-4">{day.registrationCount}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
