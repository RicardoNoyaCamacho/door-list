# Patrones reales de Door List

## Qué reutilizar

Las rutas son relativas a la raíz del repositorio. Inspecciona estos archivos
antes de crear un componente equivalente; si cambian de ubicación, sigue sus
importaciones actuales.

| Necesidad | Implementación existente | Responsabilidad |
| --- | --- | --- |
| Marco del panel | `app/dashboard/layout.tsx` | Un solo `main`, ancho máximo, navegación y cierre de sesión |
| Listado del organizador | `app/dashboard/page.tsx` | Consulta autenticada y tarjetas de eventos |
| Detalle del evento | `app/dashboard/eventos/[eventId]/page.tsx` | Aforo, tipos de entrada y asistentes |
| Envío de formularios | `components/organizer-form.tsx` | Solicitud JSON, pendiente, errores controlados y refresco |
| Paginación | `components/dashboard-pagination.tsx` | Enlaces Anterior/Siguiente con `pagina` |
| Contratos de dominio | `lib/domain.ts` | `Event`, `TicketType`, `Ticket` y `Registration` son entidades distintas |
| Fechas | `lib/dates.mjs` | Formato en hora de Ciudad de México |
| Lectura del panel | `lib/dashboard.ts` | Sesión, consultas y mapeo a contratos de UI |

Las pantallas existentes pueden contener diferencias de padding, sombras o
estados vacíos. Úsalas para comprender integración y comportamiento; aplica
las recetas de `SKILL.md` a la UI nueva o solicitada. No conviertas cada
diferencia existente en una excepción ni amplíes la tarea a todas las rutas.

## Tarjeta de evento

Ejemplo dentro de una cuadrícula `grid gap-6 md:grid-cols-2`. Importa `Event` de
`@/lib/domain`, `formatEventDate` de `@/lib/dates.mjs` y `Link` de `next/link`.
El título de una tarjeta en el listado es un H2; dentro de una sección con H2,
utiliza H3 y su receta tipográfica.

```tsx
<article className="min-w-0 border border-[#18231f]/15 bg-white/65 p-6">
  <p className="text-xs font-semibold uppercase tracking-wide text-[#4f5d56]">
    {event.status === "published" ? "Publicado" : "Borrador"}
  </p>
  <h2 className="mt-4 break-words text-2xl font-semibold">{event.title}</h2>
  <p className="mt-4">
    <time dateTime={event.startsAt}>{formatEventDate(event.startsAt)}</time>
  </p>
  <p className="mt-2 break-words text-[#4f5d56]">{event.venue}</p>
  <p className="mt-2 text-sm">Aforo total: {event.capacity}</p>
  <Link
    href={`/dashboard/eventos/${event.id}`}
    prefetch={false}
    className="mt-5 inline-flex min-h-11 items-center justify-center bg-[#18231f] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f]"
  >
    Ver registros<span className="sr-only"> de {event.title}</span>
  </Link>
</article>
```

No pongas otra acción interactiva dentro del enlace. Un enlace no admite
`disabled`: si una navegación deja de estar disponible, explica el motivo y no
renderices un enlace activo. Las variantes `disabled:` solo surten efecto en
controles que admiten ese atributo.

## Formulario del organizador

Usa `OrganizerForm` para los endpoints de gestión que ya soporta. No lo
reimplementes para cambiar su apariencia. Mantén los nombres del contrato de
API en camelCase. Este ejemplo incluye los campos requeridos por creación de
eventos; el endpoint conserva sus validaciones y crea el evento como borrador.

```tsx
import { OrganizerForm } from "@/components/organizer-form";

const field = "mt-1 w-full border border-[#18231f]/20 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18231f]";

export function CreateEventForm() {
  return (
    <OrganizerForm endpoint="/api/eventos" className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium">
        Nombre<input name="title" required className={field} />
      </label>
      <label className="text-sm font-medium">
        Lugar<input name="venue" required className={field} />
      </label>
      <label className="text-sm font-medium">
        Fecha y hora de Ciudad de México<input name="startsAt" type="datetime-local" required className={field} />
      </label>
      <label className="text-sm font-medium">
        Aforo total<input name="capacity" type="number" min="1" step="1" required className={field} />
      </label>
      <label className="text-sm font-medium md:col-span-2">
        Descripción<textarea name="description" rows={3} className={field} />
      </label>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center bg-[#18231f] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f]">
        Crear borrador
      </button>
    </OrganizerForm>
  );
}
```

Colócalo junto a su ruta mientras solo lo use esa ruta. La extracción es opcional
si el formulario sigue siendo pequeño. Su wrapper cliente ya controla el envío;
este componente de composición no necesita `"use client"`.

Si la tarea incluye mejorar el estado pendiente, hazlo en el componente que
posee ese estado: deshabilita el formulario, conserva el texto y muestra
«Procesando…» como aviso accesible. No dupliques la solicitud ni el estado
pendiente en otro wrapper solo para producir ese aviso.

## Invariantes al aplicar estilos al dashboard

- Conserva los filtros de propiedad y las comprobaciones de sesión en servidor;
  esconder un enlace no sustituye la autorización.
- Cada conteo corresponde a registros, no a tickets emitidos ni a la longitud
  de la página visible. Los totales incluyen todas las páginas.
- Conserva la paginación y los contratos camelCase. No consultes datos privados
  desde un componente nuevo para reproducir una métrica visual.
- Importa fechas y contratos compartidos. No copies helpers ni formatos de fecha
  locales para una tabla nueva.
- Mantén las interfaces en español y los nombres de componentes en inglés.
  Conserva las rutas existentes, incluido `/dashboard`, solicitado expresamente.

## Qué significa aplicar esta skill

«Aplica `$door-list-ui` al panel» permite adaptar las pantallas del panel al
contrato visual. «Crea la skill» solo crea o actualiza estas instrucciones y
sus referencias; no modifica automáticamente las pantallas.
