import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encuentro Creativo 2026 | Doorlist",
  description: "Registro para Encuentro Creativo 2026.",
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
