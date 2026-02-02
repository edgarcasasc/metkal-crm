'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils" // Si esto da error, avísame para crear el utils
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Ruler, 
  ClipboardCheck, 
  LogOut
} from "lucide-react"

const menuItems = [
  {
    title: "Master / Dashboard",
    href: "/",
    icon: LayoutDashboard,
    color: "text-sky-500"
  },
  {
    title: "Panel Asesor",
    href: "/asesor",
    icon: Users,
    color: "text-violet-500",
  },
  {
    title: "Órdenes Activas",
    href: "/ordenes",
    icon: FileText,
    color: "text-pink-700",
  },
  {
    title: "Panel Metrólogo",
    href: "/metrologo",
    icon: Ruler,
    color: "text-orange-700",
  },
  {
    title: "Aprobación",
    href: "/aprobacion",
    icon: ClipboardCheck,
    color: "text-emerald-500",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold">
            Metkal <span className="text-blue-400">CRM</span>
          </h1>
        </Link>
        <div className="space-y-1">
          {menuItems.map((route) => (
            <Link
              key={route.href}
              href={route.href}
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
      </div>
    </div>
  )
}