'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import { cn } from "@/lib/utils" 
import { 
  LayoutDashboard, Users, FileText, Ruler, 
  ClipboardCheck, LogOut, Shield, Loader2, Gauge // 👈 Agregado Gauge
} from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.email) {
       const { data: profile } = await supabase
         .from('profiles')
         .select('role') 
         .eq('email', user.email)
         .single()
       
       setRole(profile?.role || 'Asesor')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const allMenuItems = [
    {
      title: "Master / Dashboard",
      href: "/",
      icon: LayoutDashboard,
      color: "text-sky-500",
      roles: ['Admin', 'Gerente', 'Asesor'] 
    },
    {
      title: "Panel Asesor",
      href: "/asesor",
      icon: Users,
      color: "text-violet-500",
      roles: ['Admin', 'Gerente', 'Asesor']
    },
    {
      title: "Órdenes Activas",
      href: "/ordenes",
      icon: FileText,
      color: "text-pink-700",
      roles: ['Admin', 'Gerente', 'Asesor', 'Metrólogo']
    },
    {
      title: "Panel Metrólogo",
      href: "/metrologia",
      icon: Ruler,
      color: "text-orange-700",
      roles: ['Admin', 'Gerente', 'Metrólogo']
    },
    // 👇 NUEVO ÍTEM DE INVENTARIO
    {
      title: "Inventario",
      href: "/inventario",
      icon: Gauge,
      color: "text-purple-600",
      roles: ['Admin', 'Gerente', 'Metrólogo']
    },
    {
      title: "Aprobación",
      href: "/aprobacion",
      icon: ClipboardCheck,
      color: "text-emerald-500",
      roles: ['Admin', 'Gerente']
    },
  ]

  const visibleMenu = allMenuItems.filter(item => 
    role ? item.roles.includes(role) : false
  )

  return (
    <div className="space-y-4 py-4 flex flex-col min-h-screen bg-slate-900 text-white">
      <div className="px-3 py-2 flex-1 flex flex-col">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold">
            Metkal <span className="text-blue-400">CRM</span>
          </h1>
        </Link>
        
        {loading ? (
           <div className="px-4 text-slate-500 text-xs flex gap-2"><Loader2 className="animate-spin" size={14}/> Cargando menú...</div>
        ) : (
          <div className="space-y-1">
            {visibleMenu.map((route) => (
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
        )}

        <div className="mt-auto pt-8 border-t border-slate-800">
             <div className="px-4 mb-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conectado como</p>
                <div className="flex items-center gap-2 mt-2 bg-slate-800/50 p-2 rounded-md">
                    <Shield size={14} className="text-emerald-500"/>
                    <span className="text-xs font-bold text-slate-200">{role || 'Cargando...'}</span>
                </div>
             </div>
             
             <button 
                onClick={handleLogout}
                className="w-full text-sm group flex p-3 justify-start font-medium cursor-pointer text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
             >
                <div className="flex items-center flex-1">
                  <LogOut className="h-5 w-5 mr-3 group-hover:text-red-400 transition-colors" />
                  Cerrar Sesión
                </div>
             </button>
        </div>

      </div>
    </div>
  )
}