import { Sidebar } from "@/components/sidebar"
import type { Metadata } from "next";

// No importes globals.css aquí, ya lo hace el Root Layout

export const metadata: Metadata = {
  title: "METKAL Dashboard",
  description: "Sistema de gestión de cotizaciones y servicios",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full relative">
      {/* Barra Lateral (Oculta en celular, visible en escritorio) */}
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-slate-900">
        <Sidebar />
      </div>

      {/* Contenido Principal */}
      <main className="md:pl-72 h-full bg-slate-50">
        {/* Aquí podríamos poner una barra superior (Navbar) */}
        <div className="h-full p-8">
            {children}
        </div>
      </main>
    </div>
  )
}