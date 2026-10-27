This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Eventos públicos

La ruta `/` lista eventos publicados desde el inicio del día actual en
`America/Mexico_City`, ordenados por fecha. Se puede consultar sin sesión y cada
evento enlaza a su registro público. Los eventos de hoy permanecen visibles
aunque su hora haya pasado; el cupo se comprueba al registrarse. El panel privado
está en `/dashboard`, con acceso mediante `/acceso`. La gestión de eventos
continúa en `/organizador`.

## Panel del organizador

`/dashboard` lista únicamente los eventos del usuario autenticado, incluidos
borradores y eventos pasados. `/dashboard/eventos/[eventId]` muestra el total de
registros sobre el aforo del evento, el conteo sobre el aforo de cada tipo de
entrada y los asistentes (nombre, correo, tipo de entrada y fecha de registro).
Los eventos y asistentes se paginan de 50 en 50; los conteos incluyen todos los
registros, independientemente de la página o del límite de filas de PostgREST.

Aplica `20261027130000_add_organizer_dashboard.sql` antes de utilizar el panel.
La migración habilita SELECT en `registrations` para usuarios autenticados con
una política RLS que exige ser dueño del evento. La RPC `get_organizer_event`
usa los permisos del usuario y comprueba además la propiedad del evento.
Otro organizador no puede consultar el detalle aunque el evento esté publicado.
Las visitas sin sesión se redirigen a `/acceso`; los eventos ajenos o inexistentes
muestran una página de evento no disponible. No se utiliza una clave de servicio.

El detalle también muestra una gráfica de registros diarios desde la primera
publicación hasta hoy, con días sin registros en cero y fechas de Ciudad de México.
Consume `GET /api/eventos/[eventId]/registros-por-dia`, con sesión y acceso exclusivo
del propietario. Responde `{ publishedAt, publishedAtEstimated, days }`, donde cada
día contiene `{ date, registrationCount }`; los errores son `{ error }` con HTTP
400 para un identificador inválido, 401 sin sesión, 403 para un evento ajeno o
inexistente y 500 si falla la consulta. Los conteos incluyen todos los registros.

Aplica también `20261027140000_add_daily_registration_analytics.sql` antes de
utilizar la gráfica. Guarda la primera publicación aunque el evento vuelva a
borrador. Para eventos históricos, estima el inicio con el primer registro o,
si no existe, con la creación del evento; la gráfica indica esa limitación.
Los borradores nunca publicados no muestran una serie de datos. La migración
se valida con `npm run test:db` en un contenedor aislado, sin modificar Supabase.

## Registro público

La ruta `/eventos/[eventId]/registro` permite registrarse sin cuenta en eventos publicados,
hasta el final de su fecha en `America/Mexico_City`. El panel del organizador incluye
el enlace para compartir. Cada registro ocupa una plaza y cada email normalizado admite
un solo registro por evento. La confirmación aparece en pantalla y envía la entrada por email.

Antes de desplegar la página, aplica las migraciones de `supabase/migrations` con el
flujo habitual del proyecto (`npx supabase db push` para el proyecto vinculado).
La RPC `get_public_registration_event` expone información pública y cupos agregados;
`register_event_attendee` valida y crea el registro en una transacción. Ambas admiten
los roles `anon` y `authenticated`; la tabla `registrations` no permite escrituras
directas a esos roles. Su lectura está restringida al dueño del evento mediante
RLS. No se necesita una clave de servicio.

Los eventos y tipos de entrada con registros no se pueden eliminar ni reducir por
debajo de sus plazas ocupadas. Los cambios de entrada y los registros comparten un
bloqueo del evento para proteger el cupo ante solicitudes concurrentes.

## Emisión de entradas

Cada registro confirmado emite exactamente una fila en `tickets`, con un código
criptográfico aleatorio de 32 bytes (64 caracteres hexadecimales), único y generado
por PostgreSQL. La emisión y el registro se confirman en la misma transacción: un
fallo al emitir la entrada revierte el registro. La migración también emite entradas
para los registros existentes. El código y el registro asociado son inmutables.

La confirmación enlaza a `/entradas/[code]`, donde se muestran los datos del
asistente, el evento, el tipo de entrada, el estado actual y el código en un QR
generado localmente. El QR contiene únicamente el código, sin datos personales.
El botón «Actualizar estado» vuelve a consultar la base de datos.

Los estados almacenados son exactamente `valid`, `used` y `revoke`; se presentan
como «Válida», «Utilizada» y «Revocada». Esta funcionalidad no incluye controles de
check-in o revocación. Visitar la entrada no cambia su estado ni deja de funcionar
cuando cierra el registro al evento.

El enlace completo actúa como credencial de consulta y debe conservarse de forma
privada. No hay listados públicos ni consultas por email, registro o identificador
interno. `get_public_ticket` exige el código completo; los roles públicos no pueden
leer ni modificar directamente `tickets`. Los reintentos de registro no revelan
códigos existentes. Las páginas usan `no-store`, `no-referrer` y `noindex`.

## Email de confirmación

Configura `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en el entorno del servidor (también
en el despliegue). El remitente debe estar autorizado en Resend. Estas variables no
se exponen al navegador. No se necesitan dependencias adicionales ni migraciones.

Después de confirmar un registro nuevo, el servidor consulta la entrada emitida y
envía el email mediante la API de Resend. El mensaje incluye nombre del asistente,
evento, fecha y hora de Ciudad de México, lugar y tipo de entrada. El QR se genera
localmente como PNG y se adjunta con Content-ID para mostrarse dentro del correo,
sin abrir enlaces ni descargar imágenes de un servidor externo. Incluye versión
de texto y el código escrito como alternativa. Los datos del evento se escapan
antes de insertarlos en el HTML.

El formulario espera la respuesta de Resend y muestra el resultado del envío. Una
aceptación de la API no garantiza la entrega final al buzón. Los errores de red,
429 y 5xx se reintentan una vez, con el mismo cuerpo y clave de idempotencia. Si el
envío falla, se conserva la confirmación del registro y el enlace a la entrada,
con un aviso para guardarlo. No se vuelve a registrar al asistente ni se envían
emails al detectar un registro duplicado. No hay cola de reenvío en segundo plano
ni envío retroactivo para registros existentes.

## Verificación

- `npm test`: validación de campos, códigos, decodificación de QR y envío de emails
  con Resend simulado, sin enviar mensajes reales (Node.js 22.18+).
- `npm run test:db`: migraciones, permisos, fechas, emisión atómica, duplicados y concurrencia real en
  PostgreSQL. Requiere Docker; crea un contenedor sin red y lo elimina al terminar.
  Usa `postgres:16` por defecto; puedes cambiar la imagen mediante
  `REGISTRATION_TEST_POSTGRES_IMAGE=postgres:17 npm run test:db`.
- `npm run lint` y `npm run build`: comprobaciones de código y compilación.

Las pruebas no usan ni modifican la base de datos vinculada.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
