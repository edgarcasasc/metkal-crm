import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metkal CRM",
  description: "Sistema de Laboratorio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}