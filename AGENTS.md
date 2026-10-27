## Contexto

Consulta la documentación oficial de la versión instalada en `node_modules/next/dist/docs/` antes de escribir código de Next.js; ten presente que la versión instalada puede diferir de lo que conoces y no presupongas compatibilidad con versiones conocidas.
Usa Server Components por defecto. Añade `"use client"` solo cuando exista una necesidad concreta de interacción, estado o acceso a APIs del navegador.

## Estructura

Coloca las rutas en `app/`. Coloca la UI compartida en `components/`. Coloca la lógica y las utilidades compartidas en `lib/`. Coloca los clientes de Supabase en `lib/supabase/`. Coloca el esquema de base de datos en `supabase/migrations/`.
Mantén cada componente usado por una sola ruta junto a esa ruta. Mueve a `components/` cada componente usado por dos o más rutas.

## Vocabulario

Mantén un significado único y consistente para `Event`, `TicketType`, `Ticket` y `Registration` en todo el repositorio. Trata `Event`, `TicketType`, `Ticket` y `Registration` como entidades distintas; no las uses como sinónimos.
Nombra las tablas en plural y snake_case según su entidad: `events`, `ticket_types`, `tickets`, `registrations`.

## Idioma

Escribe el código, los nombres y los tipos en inglés. Escribe los textos de la interfaz en español. Define las rutas públicas en español y nombra en inglés los componentes que las sirven.

## Casing

Limita snake_case a la capa de persistencia. Define todos los contratos de API, tanto de solicitud como de respuesta, en camelCase. Convierte los nombres entre snake_case y camelCase en la frontera de persistencia.

## Fuente unica de verdad

Define en `lib/` los tipos compartidos entre API, email y UI; impórtalos sin redefinirlos por archivo. Define los helpers compartidos de fecha y formato en `lib/`; impórtalos sin copiarlos entre pantallas.

## Errores

Devuelve toda respuesta de error de API como JSON con la forma `{ error: string }`. Responde a los errores de negocio con el código HTTP correspondiente; no uses 200.
Comprueba `response.ok` en el cliente antes de interpretar el cuerpo de la respuesta.
Muestra mensajes controlados por la aplicación en la UI; nunca muestres mensajes crudos del proveedor.

## Base de datos

Registra todo cambio de esquema en un archivo de migración versionado; no uses SQL suelto.
Habilita RLS en toda tabla expuesta.
