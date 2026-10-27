# Referencia: tabla de asistentes

Usa esta anatomía al crear o modificar una tabla. Adapta los nombres y las
columnas al dominio, conservando clases y orden de estados. Este ejemplo muestra
dos columnas; no exige crear una nueva tabla si ya existe un componente útil.

Los tipos de datos reales se importan de `lib/`. La unión siguiente solo describe
estado de presentación local y evita mostrar carga, error y vacío a la vez.

```tsx
import type { Registration } from "@/lib/domain";

type AttendeeTableState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; registrations: Registration[] };

export function AttendeeTable({ state }: { state: AttendeeTableState }) {
  return (
    <section aria-labelledby="attendees-heading" aria-busy={state.status === "loading"} className="mt-10">
      <h2 id="attendees-heading" className="text-2xl font-semibold">Asistentes registrados</h2>
      {state.status === "loading" && (
        <p role="status" className="mt-4 text-sm text-[#4f5d56]">Cargando asistentes…</p>
      )}
      {state.status === "error" ? (
        <div role="alert" className="mt-5 border border-[#b7452b] bg-[#ff6b4a]/10 p-6 text-[#b7452b]">
          No pudimos cargar los asistentes. Intenta de nuevo.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto border border-[#18231f]/15 bg-white/65">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Nombre y correo de los asistentes registrados</caption>
            <thead className="border-b border-[#18231f]/15">
              <tr>
                <th scope="col" className="px-5 py-4">Nombre</th>
                <th scope="col" className="px-5 py-4">Correo electrónico</th>
              </tr>
            </thead>
            <tbody>
              {state.status === "loading" ? (
                [0, 1, 2].map((row) => (
                  <tr key={row} aria-hidden="true" className="border-b border-[#18231f]/10 last:border-0">
                    {[0, 1].map((column) => (
                      <td key={column} className="px-5 py-4">
                        <div className="h-4 w-32 bg-[#18231f]/10" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : state.registrations.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-5 py-10 text-center">
                    <p role="status" className="font-semibold">Aún no hay asistentes</p>
                    <p className="mt-2 text-[#4f5d56]">Los registros confirmados aparecerán aquí.</p>
                  </td>
                </tr>
              ) : (
                state.registrations.map((registration) => (
                  <tr key={registration.id} className="border-b border-[#18231f]/10 last:border-0">
                    <td className="max-w-xs break-words px-5 py-4">{registration.name}</td>
                    <td className="max-w-xs break-words px-5 py-4">{registration.email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

El ejemplo usa dos columnas para mantenerlo breve; al añadir tipo de entrada y
fecha, el estado vacío pasa a `colSpan={4}`, y los placeholders a cuatro celdas.
Importa el helper de fecha existente de `lib/` para cualquier fecha visible.

Este componente puede seguir siendo de servidor. El reintento se conecta al
mecanismo real de la ruta; no añadas un botón sin función ni una callback de
servidor no serializable a un componente cliente.

## Marco de página y composición

En una ruta sin marco, envuelve el contenido así:

```tsx
<main className="min-h-screen bg-[#f5f0e8] px-5 py-10 text-[#18231f] sm:px-10">
  <div className="mx-auto max-w-6xl">
    <h1 className="break-words text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Tus eventos</h1>
    <p className="mt-4 text-[#4f5d56]">Consulta los registros de tus eventos.</p>
    {/* Tabla o tarjetas usando las recetas de SKILL.md. */}
  </div>
</main>
```

Dentro de `app/dashboard/layout.tsx`, el marco ya existe. La página hija comienza
con una sección; no vuelve a introducir `main`, padding exterior ni `max-w-6xl`.

## Decisiones que el ejemplo fija

| Entrada | Salida esperada |
| --- | --- |
| Carga pendiente | Aviso de carga, tres filas estáticas; ningún mensaje vacío |
| Consulta completada con `[]` | Encabezados y una fila vacía con `colSpan` correcto |
| Consulta fallida | Alerta de error; ningún mensaje de lista vacía |
| Nombre o correo largo | Texto con salto de línea; sin ensanchar la página |
| Acción disponible | Receta de botón de SKILL.md; enlace si navega |

Evita sustituir el vacío por una ilustración, el loader por un spinner de otra
librería o la tabla móvil por tarjetas con otro lenguaje visual.
