import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventos | Door List",
  description: "Descubre eventos con registro abierto y reserva tu entrada con Door List.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
