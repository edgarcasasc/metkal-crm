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
  const [editingId, setEditingId] = useState<string | null>(null) // Para saber si editamos o creamos
  
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
      // 1. Cargar Estadísticas
      const { count: ordersCount } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).is('no_factura', null)
      const { count: quotesCount } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('estatus', 'En Revisión')
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count: approvedCount } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('estatus', 'Aprobada').gte('fecha', startOfMonth)

      setStats({
        activeOrders: ordersCount || 0,
        pendingQuotes: quotesCount || 0,
        approvedThisMonth: approvedCount || 0
      })

      // 2. Cargar Asesores (Tabla profiles)
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

  // --- ABRIR MODAL (CREAR O EDITAR) ---
  const handleOpenModal = (advisor?: Advisor) => {
    if (advisor) {
      // Modo Edición
      setEditingId(advisor.id!)
      setFormData({
        nombre: advisor.nombre,
        email: advisor.email,
        telefono: advisor.telefono || '',
        rol: advisor.rol || 'Asesor'
      })
    } else {
      // Modo Crear
      setEditingId(null)
      setFormData({ nombre: '', email: '', rol: 'Asesor', telefono: '' })
    }
    setIsModalOpen(true)
  }

  // --- GUARDAR (INSERT O UPDATE) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      if (editingId) {
        // ACTUALIZAR EXISTENTE
        const { error } = await supabase
          .from('profiles')
          .update({
             nombre: formData.nombre,
             email: formData.email,
             telefono: formData.telefono,
             rol: formData.rol
          })
          .eq('id', editingId)
        
        if (error) throw error
        alert("✅ Usuario actualizado")
      } else {
        // CREAR NUEVO
        const { error } = await supabase
          .from('profiles')
          .insert([{ 
            nombre: formData.nombre, 
            email: formData.email, 
            telefono: formData.telefono, 
            rol: formData.rol 
          }])
        
        if (error) throw error
        alert("✅ Usuario creado exitosamente")
      }

      // Recargar lista y cerrar
      fetchDashboardData()
      setIsModalOpen(false)

    } catch (error: any) {
      alert("❌ Error: " + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // --- ELIMINAR ---
  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar a este usuario?")) return

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      
      // Actualizar lista visualmente
      setAdvisors(prev => prev.filter(a => a.id !== id))
      alert("🗑️ Usuario eliminado")
    } catch (error: any) {
      alert("Error al eliminar: " + error.message)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-slate-50">
      
      {/* HEADER */}
      <div className="mb-4 border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={36} />
            Centro de Comando
            </h2>
            <p className="text-slate-500 font-medium pl-12">
            Resumen operativo y gestión de equipo
            </p>
        </div>
      </div>
      
      {/* --- KPIs (Indicadores) --- */}
      <div className="grid gap-6 md:grid-cols-4">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group">
             <div>
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Órdenes Activas</h3>
                <p className="text-4xl font-black text-slate-800 mt-2">{loading ? '-' : stats.activeOrders}</p>
             </div>
             <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Activity size={24} /></div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group">
             <div>
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Por Aprobar</h3>
                <p className="text-4xl font-black text-slate-800 mt-2">{loading ? '-' : stats.pendingQuotes}</p>
             </div>
             <div className="bg-amber-50 p-3 rounded-xl text-amber-500"><Clock size={24} /></div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group">
             <div>
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Ventas Mes</h3>
                <p className="text-4xl font-black text-slate-800 mt-2">{loading ? '-' : stats.approvedThisMonth}</p>
             </div>
             <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><FileCheck size={24} /></div>
          </div>
          
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group">
             <div>
                <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Equipo</h3>
                <p className="text-4xl font-black text-slate-800 mt-2">{loading ? '-' : advisors.length}</p>
             </div>
             <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Users size={24} /></div>
          </div>
      </div>

      {/* --- SECCIÓN DE GESTIÓN DE USUARIOS (TABLA) --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header de la Tabla */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Shield size={20} className="text-indigo-600"/>
                    Directorio de Usuarios
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">Administración de roles y accesos</p>
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-black transition flex items-center gap-2 shadow-lg shadow-slate-200"
              >
                <Plus size={16}/> Nuevo Usuario
              </button>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4">Nombre / Correo</th>
                        <th className="px-6 py-4">Rol</th>
                        <th className="px-6 py-4">Teléfono</th>
                        <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/>Cargando equipo...</td></tr>
                    ) : advisors.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay usuarios registrados.</td></tr>
                    ) : (
                        advisors.map((advisor) => (
                            <tr key={advisor.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs uppercase border border-indigo-100">
                                            {advisor.nombre ? advisor.nombre.substring(0,2) : 'NN'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 uppercase text-xs">{advisor.nombre}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{advisor.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide border ${
                                        advisor.rol === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        advisor.rol === 'Gerente' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        advisor.rol === 'Metrólogo' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                        {advisor.rol || 'Asesor'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                    {advisor.telefono || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleOpenModal(advisor)}
                                            className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-md transition border border-transparent hover:border-blue-200"
                                            title="Editar"
                                        >
                                            <Pencil size={14}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(advisor.id!)}
                                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition border border-transparent hover:border-red-200"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* --- MODAL (POPUP) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <UserPlus className="text-blue-600" size={20}/>
                        {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                        <X size={20}/>
                    </button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nombre Completo</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase"
                            placeholder="Ej. JUAN PÉREZ"
                            value={formData.nombre}
                            onChange={e => setFormData({...formData, nombre: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Correo Electrónico</label>
                        <input 
                            required
                            type="email" 
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all lowercase"
                            placeholder="Ej. juan@metkal.com.mx"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Teléfono</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                placeholder="81..."
                                value={formData.telefono}
                                onChange={e => setFormData({...formData, telefono: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Rol / Puesto</label>
                            <div className="relative">
                                <select 
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white appearance-none"
                                    value={formData.rol}
                                    onChange={e => setFormData({...formData, rol: e.target.value})}
                                >
                                    <option value="Asesor">Asesor</option>
                                    <option value="Metrólogo">Metrólogo</option>
                                    <option value="Gerente">Gerente</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                                    <Shield size={16}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-50 transition"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={processing}
                            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-black transition flex items-center justify-center gap-2 shadow-lg shadow-slate-300"
                        >
                            {processing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                            {editingId ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  )
}