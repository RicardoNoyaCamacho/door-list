---
name: door-list-ui
description: Mantén el estilo de UI de Door List al crear o modificar páginas, formularios, tablas, componentes o estados visuales en este repositorio, y al revisar explícitamente su consistencia visual. Incluye paleta, tipografía, espaciado y estados de carga, vacío y error. No se aplica a cambios exclusivamente de API, base de datos o lógica sin UI.
---

# UI de Door List

Aplica este contrato visual a la UI que toque la tarea. Conserva el comportamiento,
los datos, la autorización y el alcance pedido. Un encargo de UI no autoriza
desplegar ni modificar datos reales. Sigue también el `AGENTS.md` del proyecto.

## Cuándo aplicarla

- Crear una pantalla, formulario, tabla o componente visible en Door List.
- Modificar el marcado, las clases o los estados visuales de una pantalla existente.
- Recibir una petición de unificar o revisar el estilo de UI de este proyecto.
- Invocación explícita: `$door-list-ui`.

Si el cambio solo afecta lógica, API o migraciones, no refactorices la UI.
Cambiar un texto aislado tampoco justifica rediseñar la pantalla.

## Contrato visual

Usa Tailwind CSS v4 y las recetas de abajo. Los valores reflejan la UI existente.
No añadas otra librería visual, fuente, paleta, gradiente, sombra o animación por
iniciativa propia. No interpretes «limpio» o «moderno» como un cambio de sistema.

### Paleta por función

| Función | Clase canónica |
| --- | --- |
| Fondo de página | `bg-[#f5f0e8]` |
| Texto principal | `text-[#18231f]` |
| Texto secundario | `text-[#4f5d56]` |
| Superficie de tarjeta o tabla | `bg-white/65` |
| Fondo de controles | `bg-white` |
| Bordes de tarjetas y tablas | `border border-[#18231f]/15` |
| Separadores internos | `border-[#18231f]/10` |
| Bordes de controles | `border border-[#18231f]/20` |
| Acción principal | `bg-[#18231f] text-white` |
| Error y acción destructiva | `text-[#b7452b]` |
| Contenedor de error | `border border-[#b7452b] bg-[#ff6b4a]/10` |
| Confirmación | `border border-[#18231f]/15 bg-white/65 text-[#18231f]` con texto explícito |

Mantén las opacidades indicadas; no uses tonos «parecidos». Publicado y Borrador
se distinguen con texto, sin inventar colores de estado. El error combina texto
con semántica accesible; el color nunca es su única señal.

### Tipografía

Conserva `Arial, Helvetica, sans-serif` de `app/globals.css`. Sin fuentes externas.

| Elemento | Clase canónica |
| --- | --- |
| H1 de página | `break-words text-4xl font-semibold tracking-[-0.045em] sm:text-5xl` |
| H2 de sección | `text-2xl font-semibold` |
| H3 de tarjeta | `break-words text-lg font-semibold` |
| Texto general | `text-base` (o tamaño heredado equivalente) |
| Ayuda y tabla | `text-sm` |
| Etiqueta de campo | `text-sm font-medium` |
| Estado breve | `text-xs font-semibold uppercase tracking-wide text-[#4f5d56]` |
| Marca de cabecera | `text-sm font-semibold uppercase tracking-[0.18em]` |

### Espaciado y geometría

La unidad es 4 px. Usa esta asignación por función:

| Función | Receta |
| --- | --- |
| Página | `min-h-screen bg-[#f5f0e8] px-5 py-10 text-[#18231f] sm:px-10` |
| Ancho del contenido | `mx-auto max-w-6xl` |
| Cabecera | `flex flex-wrap items-center justify-between gap-5 border-b border-[#18231f]/20 pb-6` |
| Separación entre secciones | `mt-10` |
| Título a descripción | `mt-4` |
| Título a tabla o lista | `mt-5` |
| Tarjeta | `min-w-0 border border-[#18231f]/15 bg-white/65 p-6` |
| Cuadrícula de tarjetas | `grid gap-6 md:grid-cols-2` |
| Formulario | `grid gap-4 md:grid-cols-2` |
| Tabla, encabezados y celdas | `px-5 py-4` |

Esquinas rectas, sin sombras en componentes nuevos. Los layouts existentes que
ya contienen el marco de página lo proporcionan una sola vez: no anides otro
`main`, ancho máximo ni padding exterior en sus páginas hijas.
Usa `min-w-0`, `break-words` y un contenedor de tabla `overflow-x-auto` para
contenido largo. Mantén las tablas como tablas en móvil.

### Controles

- Botón principal: `inline-flex min-h-11 items-center justify-center bg-[#18231f] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f]`.
- Botón secundario: la misma receta, sustituyendo fondo y texto por `border border-[#18231f] text-[#18231f]`.
- Enlace de navegación textual: `text-sm font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18231f]`.
- Input, select y textarea: `mt-1 w-full border border-[#18231f]/20 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18231f]`.
- Usa enlaces para navegar y botones para acciones. Conserva etiquetas visibles,
  foco y `disabled` en acciones pendientes. El texto pendiente es «Procesando…».

## Estados de tablas y carga

Antes de escribir una tabla o lista, lee
[references/table-states.md](references/table-states.md). Incluye sus estados
en el cambio, sin confundir una consulta fallida con un resultado vacío.

- **Con datos:** encabezados reales, `caption` accesible, `th scope="col"`, claves
  estables y paginación cuando la fuente ya la proporciona.
- **Vacía:** conserva encabezados; una fila con `colSpan` igual al número de
  columnas. Título «Aún no hay {entidad plural}» y explicación de una frase.
  Ofrece una acción solo si existe, el usuario puede ejecutarla y es pertinente.
- **Filtro sin resultados:** «No hay resultados con estos filtros». Ofrece
  «Limpiar filtros» solo si existe esa interacción. Conserva los filtros actuales.
- **Cargando:** conserva la geometría conocida, muestra tres filas de placeholder
  estático y «Cargando {entidad plural}…» mediante `role="status"`. No muestres
  temporalmente el estado vacío ni un conteo de cero. Usa `aria-busy` en la región.
- **Error:** mensaje controlado «No pudimos cargar {entidad plural}. Intenta de
  nuevo.» con `role="alert"`. Incluye «Volver a intentar» si hay mecanismo de
  reintento; en un `error.tsx`, consulta la API de la versión instalada de Next.js.

Si la carga ocurre antes de conocer las columnas o de renderizar el marco,
`loading.tsx` puede mostrar solo un mensaje `role="status"` en `py-12`, dentro
del layout existente. No inventes una tabla que no corresponde a esa ruta.

## Estructura de componentes

Al crear tarjetas, formularios o navegación, consulta
[references/project-patterns.md](references/project-patterns.md): contiene el mapa
de componentes reales y ejemplos de composición. Las recetas de este contrato
prevalecen sobre diferencias visuales de pantallas todavía no unificadas.

- Antes de crear UI compartida, inspecciona `components/` y reutiliza la existente.
- Sigue `AGENTS.md`: componentes de una ruta junto a ella; los de dos o más rutas
  en `components/`; contratos y formato compartidos en `lib/`.
- Separa la consulta/autorización del render de tabla. Un componente visual
  recibe datos y estado por props; no crea otro cliente de Supabase ni consulta
  registros para calcular su apariencia.
- Al compartir una receta en dos rutas, extrae un componente con props pequeñas
  (`children`, título, descripción, estado). No crees un framework genérico de
  tablas, un catálogo de variantes ni primitivas que la tarea no necesita.
- Usa Server Components por defecto. Necesitar un estado de carga no obliga a
  usar `useState`: aprovecha los límites de carga del router cuando corresponda.

## Aplicación y verificación

1. Identifica qué partes visibles cambia la tarea y qué layout las envuelve.
2. Elige las recetas por función. Si falta una regla, usa el patrón existente más
   cercano y declara la decisión; no añadas un nuevo token silenciosamente.
3. Implementa los estados pertinentes. No cambies otras pantallas para conseguir
   consistencia global salvo petición expresa.
4. Revisa a 375 px y 1280 px cuando haya navegador disponible: sin desbordamiento
   horizontal de la página, tabla desplazable, nombres largos y foco visible.
   Comprueba datos, vacío, carga y error si el cambio los afecta. Si no puedes
   verificarlos en navegador, indica ese límite; no afirmes revisión visual.
5. Ejecuta las comprobaciones apropiadas del proyecto. No modifiques información
   real ni envíes mensajes para generar estados de prueba.

Una petición explícita de cambiar el diseño prevalece sobre estos valores.
Si pide un cambio permanente del sistema, actualiza este contrato y los ejemplos
afectados en el mismo cambio. Para comprobar la selección y reproducibilidad,
usa [references/acceptance-cases.md](references/acceptance-cases.md).
