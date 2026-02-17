'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Search, Plus, AlertTriangle, CheckCircle2, 
    Calendar, FileText, Trash2, Gauge, XCircle
} from 'lucide-react'

export default function InventoryPage() {
  const supabase = createClient()
  const [patterns, setPatterns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Estado para Modal de Nuevo Patrón
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newPattern, setNewPattern] = useState({
      clave: '', descripcion: '', marca: '', trazabilidad: '', 
      fecha_calibracion: '', fecha_vencimiento: ''
  })

  useEffect(() => {
    fetchPatterns()
  }, [])

  async function fetchPatterns() {
    setLoading(true)
    const { data } = await supabase.from('patterns').select('*').order('clave', { ascending: true })
    setPatterns(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
      if (!newPattern.clave || !newPattern.descripcion) return alert("Llena los datos básicos")
      
      const { error } = await supabase.from('patterns').insert({
          ...newPattern,
          estatus: 'Activo'
      })

      if (error) alert(error.message)
      else {
          setIsModalOpen(false)
          setNewPattern({ clave: '', descripcion: '', marca: '', trazabilidad: '', fecha_calibracion: '', fecha_vencimiento: '' })
          fetchPatterns()
      }
  }

  const handleDelete = async (id: number) => {
      if(!confirm("¿Eliminar patrón? Esto no borrará calibraciones pasadas, pero dejará de sugerirse.")) return
      // Borrado lógico o físico. Físico está bien para empezar.
      await supabase.from('patterns').delete().eq('id', id)
      fetchPatterns()
  }

  // Lógica de Semáforo (Días restantes)
  const getStatusInfo = (vencimiento: string) => {
      if (!vencimiento) return { color: 'text-slate-400', label: 'Sin Fecha', bg: 'bg-slate-100' }
      
      const today = new Date()
      const venci = new Date(vencimiento)
      const diffTime = venci.getTime() - today.getTime()
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (days < 0) return { color: 'text-red-600', label: `Venció hace ${Math.abs(days)} días`, bg: 'bg-red-50', border: 'border-red-200' }
      if (days < 30) return { color: 'text-amber-600', label: `Vence en ${days} días`, bg: 'bg-amber-50', border: 'border-amber-200' }
      return { color: 'text-emerald-600', label: 'Vigente', bg: 'bg-white', border: 'border-slate-200' }
  }

  const filtered = patterns.filter(p => 
      p.clave?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
                    <Gauge className="text-purple-600"/> Inventario de Patrones
                </h1>
                <p className="text-slate-500 text-sm">Gestión de trazabilidad y vigencia de equipos de referencia.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition shadow-lg shadow-purple-200">
                <Plus size={16}/> Nuevo Patrón
            </button>
        </div>

        {/* BUSCADOR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar por Clave, Marca o Descripción..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-purple-500 transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* GRID DE TARJETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? <div className="col-span-3 text-center text-slate-400 py-10 flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div> Cargando inventario...</div> : 
             filtered.length === 0 ? <div className="col-span-3 text-center text-slate-400 py-10 border-2 border-dashed border-slate-200 rounded-xl">No se encontraron patrones.</div> :
             filtered.map(patron => {
                 const status = getStatusInfo(patron.fecha_vencimiento)

                 return (
                    <div key={patron.id} className={`rounded-xl shadow-sm border p-5 hover:shadow-md transition group relative overflow-hidden ${status.bg} ${status.border}`}>
                        
                        {/* Indicador de Estado (Semáforo) */}
                        <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase rounded-bl-lg border-b border-l ${status.border} ${status.color}`}>
                            {status.label}
                        </div>
                        
                        <div className="flex justify-between items-start mb-3 mt-2">
                            <div className="bg-white border border-slate-200 p-2 rounded text-slate-700 font-mono font-bold text-xs shadow-sm">
                                {patron.clave}
                            </div>
                            <button onClick={() => handleDelete(patron.id)} className="text-slate-300 hover:text-red-500 transition p-1"><Trash2 size={16}/></button>
                        </div>

                        <h3 className="font-bold text-slate-800 uppercase text-sm mb-1 leading-tight">{patron.descripcion}</h3>
                        <p className="text-xs text-slate-500 uppercase mb-4 font-medium">{patron.marca} • <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-600">Traz: {patron.trazabilidad}</span></p>

                        <div className="border-t border-slate-200/60 pt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="block text-[9px] text-slate-400 uppercase font-bold">Calibrado</span>
                                <span className="font-mono text-slate-600">{patron.fecha_calibracion ? new Date(patron.fecha_calibracion).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[9px] text-slate-400 uppercase font-bold">Vencimiento</span>
                                <span className={`font-mono font-bold ${status.color}`}>
                                    {patron.fecha_vencimiento ? new Date(patron.fecha_vencimiento).toLocaleDateString() : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                 )
             })}
        </div>

        {/* MODAL CREAR */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-black text-xl uppercase text-slate-800 flex items-center gap-2"><Plus size={20} className="text-purple-600"/> Registrar Patrón</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24}/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Clave Interna (ID)</label>
                            <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. P-TEMP-01" value={newPattern.clave} onChange={e => setNewPattern({...newPattern, clave: e.target.value})} />
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descripción del Equipo</label>
                            <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Termómetro Digital de Referencia" value={newPattern.descripcion} onChange={e => setNewPattern({...newPattern, descripcion: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Marca</label>
                                <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Fluke" value={newPattern.marca} onChange={e => setNewPattern({...newPattern, marca: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Certificado / Trazabilidad</label>
                                <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. CNM-2023-05" value={newPattern.trazabilidad} onChange={e => setNewPattern({...newPattern, trazabilidad: e.target.value})} />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Última Calibración</label>
                                <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" value={newPattern.fecha_calibracion} onChange={e => setNewPattern({...newPattern, fecha_calibracion: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Próximo Vencimiento</label>
                                <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" value={newPattern.fecha_vencimiento} onChange={e => setNewPattern({...newPattern, fecha_vencimiento: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-8 border-t border-slate-100 pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                        <button onClick={handleCreate} className="px-8 py-2.5 text-xs font-bold uppercase bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 transition">Guardar Equipo</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  )
}