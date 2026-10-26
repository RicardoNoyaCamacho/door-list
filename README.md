This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Registro público

La ruta `/eventos/[eventId]/registro` permite registrarse sin cuenta en eventos publicados,
hasta el final de su fecha en `America/Mexico_City`. El panel del organizador incluye
el enlace para compartir. Cada registro ocupa una plaza y cada email normalizado admite
un solo registro por evento. La confirmación aparece en pantalla; no se envían correos.

Antes de desplegar la página, aplica las migraciones de `supabase/migrations` con el
flujo habitual del proyecto (`npx supabase db push` para el proyecto vinculado).
La RPC `get_public_registration_event` expone información pública y cupos agregados;
`register_event_attendee` valida y crea el registro en una transacción. Ambas admiten
los roles `anon` y `authenticated`; la tabla `registrations` no permite acceso directo
a esos roles. No se necesita una clave de servicio.

Los eventos y tipos de entrada con registros no se pueden eliminar ni reducir por
debajo de sus plazas ocupadas. Los cambios de entrada y los registros comparten un
bloqueo del evento para proteger el cupo ante solicitudes concurrentes.

## Verificación

- `npm test`: validación de campos e identificadores (Node.js 22.18+).
- `npm run test:db`: migraciones, permisos, fechas, duplicados y concurrencia real en
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
