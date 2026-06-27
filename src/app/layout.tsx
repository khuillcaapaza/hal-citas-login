import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema para el Cronograma de Atención de Citas",
  description: "Sistema para el Cronograma de Atención de Citas — Hospital Antonio Lorena",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
