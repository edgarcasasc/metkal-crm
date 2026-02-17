import Sidebar from "@/components/sidebar" // SIN LLAVES {} porque es export default
import { MobileNavbar } from "@/components/mobile-navbar" // CON LLAVES {} porque es export const
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "METKAL Dashboard",
  description: "Sistema de gestión de metrología",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full relative">
      
      {/* 1. Navbar Móvil */}
      <div className="md:hidden">
          <MobileNavbar />
      </div>

      {/* 2. Sidebar Escritorio */}
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
        <Sidebar />
      </div>

      {/* 3. Contenido Principal */}
      <main className="md:pl-72 pt-[60px] md:pt-0 h-full">
        {children}
      </main>
    </div>
  )
}