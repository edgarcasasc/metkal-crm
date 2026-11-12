'use client'

import { useState, useEffect, useRef } from 'react'
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import { cn, withTimeout } from "@/lib/utils" 
import { 
  LayoutDashboard, Users, FileText, Ruler, 
  ClipboardCheck, LogOut, Shield, Loader2, Gauge, ListFilter
} from "lucide-react"
import { logout } from '@/app/(dashboard)/login/actions'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  
  // Ref para distinguir entre expiración de sesión y cierre intencional
  const isIntentionalLogout = useRef(false)

  useEffect(() => {
    // 0. Cargar desde localStorage ANTES de checar la red (evita Hydration Error)
    if (typeof window !== 'undefined') {
        const cachedRole = localStorage.getItem('metkal_role')
        const cachedEmail = localStorage.getItem('metkal_email')
        if (cachedRole) setRole(cachedRole)
        if (cachedEmail) setUserEmail(cachedEmail)
    }

    // 1. Chequeo inicial al cargar
    checkUser()

    // 2. SUSCRIPCIÓN EN TIEMPO REAL
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await checkUser() // Volver a consultar el rol
        } else if (event === 'SIGNED_OUT') {
            if (!isIntentionalLogout.current) {
                // La sesión expiró espontáneamente
                handleLogout(true, true)
            } else {
                setRole(null)
                setUserEmail(null)
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('metkal_role')
                    localStorage.removeItem('metkal_email')
                }
            }
        }
    })

    return () => {
        subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        
        if (user && user.email) {
           setUserEmail(user.email)
           if (typeof window !== 'undefined') localStorage.setItem('metkal_email', user.email)
           
           // Consultar perfil para el resto de usuarios
           const { data: profile } = await withTimeout(
             supabase
               .from('profiles')
               .select('role') 
               .eq('email', user.email)
               .maybeSingle(), 
             30000 
           )
           
           const fetchedRole = profile?.role || 'Asesor'
           setRole(fetchedRole)
           if (typeof window !== 'undefined') localStorage.setItem('metkal_role', fetchedRole)
        } else if (!role) {
            setRole('Asesor')
        }
    } catch (error) {
        console.warn("Aviso: Error verificando sesión en fondo:", error)
        if (!role) setRole('Asesor')
    } finally {
        setLoading(false)
    }
  }

  const handleLogout = async (expired: boolean = false, skipSignOut: boolean = false) => {
    isIntentionalLogout.current = true
    // 1. Limpiamos interfaz
    setRole(null)
    setUserEmail(null)
    if (typeof window !== 'undefined') {
        localStorage.removeItem('metkal_role')
        localStorage.removeItem('metkal_email')
    }
    
    // 2. Llamamos servidor
    await logout()
    
    // 3. Purgar caché
    if (!skipSignOut) {
        await supabase.auth.signOut()
    }
    
    window.location.href = expired ? '/login?expired=true' : '/login'
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
      title: "Magnitudes",
      href: "/magnitudes",
      icon: ListFilter,
      color: "text-amber-500",
      roles: ['Admin', 'Gerente', 'Metrólogo']
    },
    {
      title: "Panel Metrólogo",
      href: "/metrologia",
      icon: Ruler,
      color: "text-orange-700",
      roles: ['Admin', 'Gerente', 'Metrólogo']
    },
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

  const safeRole = role || 'Asesor'

  return (
    <div className="space-y-4 py-4 flex flex-col min-h-screen bg-slate-900 text-white">
      <div className="px-3 py-2 flex-1 flex flex-col">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold">
            Metkal <span className="text-blue-400">CRM</span>
          </h1>
        </Link>
        
        <div className="space-y-1">
          {allMenuItems.map((route) => {
            const hasAccess = route.roles.includes(safeRole)
            
            if (!hasAccess) {
              return (
                <div
                  key={route.href}
                  title="No tienes permisos para acceder a este módulo"
                  className="text-sm group flex p-3 w-full justify-start font-medium cursor-not-allowed opacity-40 text-slate-500 grayscale rounded-lg"
                >
                  <div className="flex items-center flex-1">
                    <route.icon className="h-5 w-5 mr-3 text-slate-500" />
                    {route.title}
                  </div>
                </div>
              )
            }

            return (
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
            )
          })}
        </div>

        <div className="mt-auto pt-8 border-t border-slate-800">
             {role && (
                 <div className="px-4 mb-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conectado como</p>
                    <div className="flex items-center gap-2 mt-2 bg-slate-800/50 p-2 rounded-md">
                        <Shield size={14} className="text-emerald-500"/>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">{role}</span>
                            {userEmail && <span className="text-[9px] text-slate-500 truncate max-w-[120px]">{userEmail}</span>}
                        </div>
                    </div>
                 </div>
             )}
             
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