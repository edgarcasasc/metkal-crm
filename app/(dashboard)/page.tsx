'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Activity, FileCheck, Users, TrendingUp, Clock, 
  Plus, X, Save, Loader2, UserPlus, Pencil, Trash2, Shield
} from 'lucide-react'

// Definimos la estructura del Asesor
interface Advisor {
  id?: string
  nombre: string
  email: string
  telefono?: string
  rol: string
}

export default function DashboardPage() {
  const supabase = createClient()

  // --- ESTADOS ---
  const [stats, setStats] = useState({ activeOrders: 0, pendingQuotes: 0, approvedThisMonth: 0 })
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal y Formulario
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Advisor>({ 
    nombre: '', 
    email: '', 
    rol: 'Asesor', 
    telefono: '' 
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const { count: ordersCount } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).is('no_factura', null)
      const { count: quotesCount } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('estatus', 'En Revisión')
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count: approvedCount } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('estatus', 'Aprobada').gte('fecha', startOfMonth)

      setStats({
        activeOrders: ordersCount || 0,
        pendingQuotes: quotesCount || 0,
        approvedThisMonth: approvedCount || 0
      })

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre', { ascending: true })
      
      setAdvisors(profilesData || [])

    } catch (error) {
      console.error("Error cargando dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (advisor?: Advisor) => {
    if (advisor) {
      setEditingId(advisor.id!)
      setFormData({
        nombre: advisor.nombre,
        email: advisor.email,
        telefono: advisor.telefono || '',
        rol: advisor.rol || 'Asesor'
      })
    } else {
      setEditingId(null)
      setFormData({ nombre: '', email: '', rol: 'Asesor', telefono: '' })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      if (editingId) {
        const { error } = await supabase.from('profiles').update(formData).eq('id', editingId)
        if (error) throw error
        alert("✅ Usuario actualizado")
      } else {
        const { error } = await supabase.from('profiles').insert([formData])
        if (error) throw error
        alert("✅ Usuario creado exitosamente")
      }
      fetchDashboardData()
      setIsModalOpen(false)
    } catch (error: any) {
      alert("❌ Error: " + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar a este usuario?")) return
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      setAdvisors(prev => prev.filter(a => a.id !== id))
      alert("🗑️ Usuario eliminado")
    } catch (error: any) {
      alert("Error al eliminar: " + error.message)
    }
  }

  return (
    // FIX MOBILE: Padding reducido en móvil (p-4), normal en escritorio (p-8)
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-600 w-8 h-8 md:w-auto md:h-auto" />
            Centro de Comando
            </h2>
            <p className="text-slate-500 font-medium text-sm md:text-base md:pl-12">
            Resumen operativo y gestión de equipo
            </p>
        </div>
      </div>
      
      {/* --- KPIs (Indicadores) --- */}
      {/* FIX MOBILE: Grid de 1 columna en móvil, 2 en tablet, 4 en desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <KPICard title="Órdenes Activas" value={stats.activeOrders} icon={<Activity size={24} />} color="blue" loading={loading} />
          <KPICard title="Por Aprobar" value={stats.pendingQuotes} icon={<Clock size={24} />} color="amber" loading={loading} />
          <KPICard title="Ventas Mes" value={stats.approvedThisMonth} icon={<FileCheck size={24} />} color="emerald" loading={loading} />
          <KPICard title="Equipo" value={advisors.length} icon={<Users size={24} />} color="indigo" loading={loading} />
      </div>

      {/* --- SECCIÓN DE GESTIÓN DE USUARIOS --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header de la Tabla */}
          <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Shield size={20} className="text-indigo-600"/>
                    Directorio
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">Administración de roles</p>
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase hover:bg-black transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
              >
                <Plus size={16}/> Nuevo Usuario
              </button>
          </div>

          {/* Tabla Responsive */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Rol</th>
                        {/* Ocultamos teléfono en pantallas muy pequeñas para dar espacio */}
                        <th className="px-6 py-4 hidden sm:table-cell">Teléfono</th>
                        <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/>Cargando...</td></tr>
                    ) : advisors.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay usuarios.</td></tr>
                    ) : (
                        advisors.map((advisor) => (
                            <tr key={advisor.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs uppercase border border-indigo-100 shrink-0">
                                            {advisor.nombre ? advisor.nombre.substring(0,2) : 'NN'}
                                        </div>
                                        <div className="max-w-[140px] truncate">
                                            <p className="font-bold text-slate-700 uppercase text-xs truncate">{advisor.nombre}</p>
                                            <p className="text-[10px] text-slate-400 font-mono truncate">{advisor.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <BadgeRole role={advisor.rol} />
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs hidden sm:table-cell">
                                    {advisor.telefono || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleOpenModal(advisor)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"><Pencil size={16}/></button>
                                        <button onClick={() => handleDelete(advisor.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* --- MODAL RESPONSIVO (FIX KEYBOARD OVERFLOW) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            {/* Agregamos max-h y overflow para que scrollee si el teclado tapa la pantalla */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 border border-slate-200 flex flex-col">
                
                {/* Header Modal - Sticky */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <UserPlus className="text-blue-600" size={20}/>
                        {editingId ? 'Editar' : 'Nuevo'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                        <X size={20}/>
                    </button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nombre</label>
                        <input required type="text" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase" 
                            placeholder="JUAN PÉREZ" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Correo</label>
                        <input required type="email" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none lowercase" 
                            placeholder="correo@ejemplo.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Teléfono</label>
                            <input type="text" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none" 
                                placeholder="81..." value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Rol</label>
                            <div className="relative">
                                <select className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white appearance-none" 
                                    value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                                    <option value="Asesor">Asesor</option>
                                    <option value="Metrólogo">Metrólogo</option>
                                    <option value="Gerente">Gerente</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                <Shield size={16} className="absolute right-3 top-3.5 pointer-events-none text-slate-400"/>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={processing} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-black flex items-center justify-center gap-2">
                            {processing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} {editingId ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  )
}

// --- Componentes auxiliares para limpiar código ---

function KPICard({ title, value, icon, color, loading }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-500",
        emerald: "bg-emerald-50 text-emerald-600",
        indigo: "bg-indigo-50 text-indigo-600"
    }
    return (
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
            <div>
               <h3 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">{title}</h3>
               <p className="text-3xl font-black text-slate-800 mt-1">{loading ? '-' : value}</p>
            </div>
            <div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
        </div>
    )
}

function BadgeRole({ role }: { role: string }) {
    const styles = role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                   role === 'Gerente' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                   role === 'Metrólogo' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                   'bg-slate-100 text-slate-600 border-slate-200';
    return <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide border ${styles}`}>{role || 'Asesor'}</span>
}