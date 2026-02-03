import { DesktopSidebar, MobileNavbar } from "@/components/sidebar"
import type { Metadata } from "next";

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
    <div className="h-full relative bg-slate-50">
      
      {/* 1. Navbar Móvil (Visible solo en celular < md) */}
      <MobileNavbar />

      {/* 2. Sidebar Escritorio (Visible solo en escritorio >= md) */}
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
        <DesktopSidebar />
      </div>

      {/* 3. Contenido Principal */}
      <main className="md:pl-72 h-full">
        {/* Eliminamos el padding fijo aquí para controlarlo en cada página */}
        <div className="h-full">
            {children}
        </div>
      </main>
    </div>
  )
}