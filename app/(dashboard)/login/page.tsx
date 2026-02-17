'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Intentar Login con Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // 2. Verificar el rol en la tabla 'profiles'
      // Usamos 'role' porque así lo definimos en la migración reciente
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role') 
        .eq('email', email)
        .single()

      if (profileError) {
        console.error("Error obteniendo perfil:", profileError)
        // Si hay error en perfil pero login exitoso, mandamos al home por seguridad
        router.refresh()
        router.push('/')
        return
      }

      // 3. Redirección inteligente basada en Rol
      router.refresh() // Actualiza caché de rutas
      
      if (profile?.role === 'Metrólogo') {
        router.push('/metrologia')
      } else {
        router.push('/') // Admin, Master y Asesor van al Dashboard
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Credenciales incorrectas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Lock className="text-white h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">METKAL CRM</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Acceso Seguro</p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center font-medium border border-red-100 flex items-center justify-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* CAMPO EMAIL */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Correo Corporativo
            </label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={18}/>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-slate-900 placeholder-slate-400"
                    placeholder="usuario@metkal.com"
                    autoComplete="email"
                    required
                />
            </div>
          </div>

          {/* CAMPO PASSWORD */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Contraseña
            </label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={18}/>
                <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-slate-900 placeholder-slate-400"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-4 text-sm uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Ingresar al Sistema'}
          </button>
        </form>
        
        {/* FOOTER */}
        <div className="mt-8 text-center text-[10px] text-slate-400">
            © 2026 Metkal Metrología. Acceso autorizado únicamente.
        </div>
      </div>
    </div>
  )
}