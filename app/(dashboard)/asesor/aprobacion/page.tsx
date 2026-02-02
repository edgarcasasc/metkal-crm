'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, CheckCircle, XCircle, Eye, Loader2, FileText, Search
} from 'lucide-react'

export default function ApprovalPage() {
  const router = useRouter()
  const supabase = createClient()

  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPendingQuotes()
  }, [])

  async function fetchPendingQuotes() {
    setLoading(true)
    try {
      // Traemos cotizaciones en estatus 'En Revisión' y unimos con clientes
      const { data, error } = await supabase
        .from('quotes')
        .select(`
            *,
            clients ( empresa )
        `)
        .eq('estatus', 'En Revisión')
        .order('id', { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (quoteId: number, action: 'Aprobar' | 'Rechazar') => {
      const newStatus = action === 'Aprobar' ? 'Aprobada' : 'Borrador'
      const confirmMsg = action === 'Aprobar' 
        ? "¿Aprobar esta cotización y generar Orden de Servicio?" 
        : "¿Rechazar y devolver a Borrador?"

      if (!confirm(confirmMsg)) return

      try {
          const { error } = await supabase
            .from('quotes')
            .update({ estatus: newStatus })
            .eq('id', quoteId)

          if (error) throw error
          
          // Actualizar lista visualmente
          setQuotes(prev => prev.filter(q => q.id !== quoteId))
          alert(`Cotización ${newStatus} exitosamente.`)

      } catch (e: any) {
          alert("Error: " + e.message)
      }
  }

  // Filtrado simple por folio o empresa
  const filteredQuotes = quotes.filter(q => 
    q.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.clients?.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen font-sans text-slate-600">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Panel de Aprobación</h1>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase">Cotizaciones pendientes de revisión</p>
        </div>
        <button onClick={() => router.push('/asesor')} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-50 transition text-slate-600 shadow-sm">
            <ArrowLeft size={16} /> VOLVER
        </button>
      </div>

      {/* CONTENIDO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          
          {/* BARRA DE BÚSQUEDA */}
          <div className="p-5 border-b border-slate-100 flex gap-4 bg-slate-50/50">
              <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                  <input 
                    type="text" 
                    placeholder="Buscar por folio o cliente..." 
                    className="w-full border border-slate-300 pl-10 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          {/* TABLA */}
          {loading ? (
              <div className="flex h-64 items-center justify-center text-slate-400 font-bold uppercase gap-2">
                  <Loader2 className="animate-spin"/> Cargando pendientes...
              </div>
          ) : filteredQuotes.length === 0 ? (
              <div className="flex flex-col h-64 items-center justify-center text-slate-400">
                  <FileText size={48} className="mb-2 opacity-20"/>
                  <p className="font-bold text-sm uppercase">No hay cotizaciones pendientes de aprobación</p>
              </div>
          ) : (
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500 font-bold uppercase border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4">Folio</th>
                              <th className="px-6 py-4">Cliente</th>
                              <th className="px-6 py-4">Fecha</th>
                              <th className="px-6 py-4">Condiciones</th>
                              <th className="px-6 py-4 text-center">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredQuotes.map((q) => (
                              <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="px-6 py-4 font-black text-blue-700 text-sm">{q.folio}</td>
                                  <td className="px-6 py-4 uppercase font-bold text-slate-700">{q.clients?.empresa || 'S/N'}</td>
                                  <td className="px-6 py-4 font-mono text-slate-500">{q.fecha || '-'}</td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1">
                                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] w-fit font-bold">Pago: {q.condicion_de_pago} días</span>
                                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] w-fit font-bold">Entrega: {q.tiempo_de_entrega} días</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex justify-center gap-2">
                                          <button 
                                            onClick={() => router.push(`/asesor/cotizacion/${q.id}`)}
                                            className="bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 p-2 rounded-lg transition shadow-sm"
                                            title="Ver Detalle"
                                          >
                                              <Eye size={16}/>
                                          </button>
                                          
                                          <button 
                                            onClick={() => handleAction(q.id, 'Rechazar')}
                                            className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition font-bold flex items-center gap-1"
                                            title="Rechazar (Volver a borrador)"
                                          >
                                              <XCircle size={16}/>
                                          </button>

                                          <button 
                                            onClick={() => handleAction(q.id, 'Aprobar')}
                                            className="bg-emerald-500 text-white hover:bg-emerald-600 p-2 rounded-lg transition font-bold flex items-center gap-2 shadow-md shadow-emerald-200"
                                            title="Aprobar Orden"
                                          >
                                              <CheckCircle size={16}/> APROBAR
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
    </div>
  )
}