'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Ruler, 
  ClipboardCheck, 
  Menu,
  X
} from "lucide-react"

const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, color: "text-sky-500" },
  { title: "Panel Asesor", href: "/asesor", icon: Users, color: "text-violet-500" },
  { title: "Órdenes Activas", href: "/ordenes", icon: FileText, color: "text-pink-700" },
  { title: "Panel Metrólogo", href: "/metrologo", icon: Ruler, color: "text-orange-700" },
  { title: "Aprobación", href: "/aprobacion", icon: ClipboardCheck, color: "text-emerald-500" },
]

// Componente interno de enlaces para reutilizar
const NavLinks = ({ onClick }: { onClick?: () => void }) => {
  const pathname = usePathname()
  return (
    <div className="space-y-1">
      {menuItems.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          onClick={onClick}
          className={cn(
            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
            pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
          )}
        >
          <div className="flex items-center flex-1">
            <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
            {route.title}
          </div>
        </Link>
      ))}
    </div>
  )
}

// Sidebar para Escritorio (Fijo a la izquierda)
export function DesktopSidebar() {
  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold">
            Metkal <span className="text-blue-400">CRM</span>
          </h1>
        </Link>
        <NavLinks />
      </div>
    </div>
  )
}

// Barra de Navegación Móvil (Menu Hamburguesa + Drawer)
export function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="font-bold text-lg">
        Metkal <span className="text-blue-400">CRM</span>
      </div>
      
      <button onClick={() => setIsOpen(true)} className="p-1 hover:bg-white/10 rounded">
        <Menu size={24} />
      </button>

      {/* Overlay Oscuro (Fondo) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer (Menú lateral deslizable) */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[70] w-64 bg-slate-900 text-white p-4 transition-transform duration-300 ease-in-out shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex justify-between items-center mb-8 px-2">
          <h2 className="text-xl font-bold">Menú</h2>
          <button onClick={() => setIsOpen(false)}>
            <X size={24} className="text-slate-400 hover:text-white" />
          </button>
        </div>
        <NavLinks onClick={() => setIsOpen(false)} />
      </div>
    </div>
  )
}