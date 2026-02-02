'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Eye, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Search
} from 'lucide-react'

export default function ApprovalPage() {
  const router = useRouter()
  const supabase = createClient()

  // Datos
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  // Controles de Tabla
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchPendingQuotes()
  }, [])

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  async function fetchPendingQuotes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
            *,
            clients ( empresa )
        `)
        .eq('estatus', 'En Revisión')
        .order('fecha', { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (quoteId: number, action: 'Aprobar' | 'Rechazar') => {
      const newStatus = action === 'Aprobar' ? 'Aprobada' : 'Borrador'
      const confirmMsg = action === 'Aprobar' 
        ? "¿Confirmar APROBACIÓN? Se generará la orden." 
        : "¿RECHAZAR cotización? Volverá a borrador."

      if (!confirm(confirmMsg)) return

      setProcessingId(quoteId)
      try {
          const { error } = await supabase.from('quotes').update({ estatus: newStatus }).eq('id', quoteId)
          if (error) throw error
          
          setQuotes(prev => prev.filter(q => q.id !== quoteId))
          // alert(`Acción realizada: ${action}`) 
      } catch (e: any) {
          alert("Error: " + e.message)
      } finally {
          setProcessingId(null)
      }
  }

  // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
  const filteredData = quotes.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      return (
          item.folio?.toLowerCase().includes(searchLower) ||
          item.clients?.empresa?.toLowerCase().includes(searchLower) ||
          item.created_by?.toLowerCase().includes(searchLower) || // Asumiendo que created_by tiene el nombre del asesor
          (item.fecha && item.fecha.includes(searchLower))
      )
  })

  const totalItems = filteredData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem)

  // Calcular rangos para el texto "Mostrando..."
  const showStart = totalItems === 0 ? 0 : indexOfFirstItem + 1
  const showEnd = Math.min(indexOfLastItem, totalItems)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-slate-100 min-h-screen font-sans text-slate-600">
      
      <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-6">Cotizaciones por aprobar</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        
        {/* CONTROLES SUPERIORES */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 text-xs font-bold text-slate-500">
            
            {/* Selector de Registros */}
            <div className="flex items-center gap-2">
                <span>Mostrar</span>
                <select 
                    value={itemsPerPage} 
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-slate-300 rounded p-1.5 focus:outline-none focus:border-blue-500 bg-white"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span>registros</span>
            </div>

            {/* Buscador */}
            <div className="flex items-center gap-2">
                <span>Buscar:</span>
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-slate-300 rounded p-1.5 w-48 focus:outline-none focus:border-blue-500"
                />
            </div>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto mb-4 border border-slate-200 rounded">
            <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase">
                    <tr>
                        <th className="p-3 border-r border-slate-100">Fecha</th>
                        <th className="p-3 border-r border-slate-100">Cliente</th>
                        <th className="p-3 border-r border-slate-100">Asesor</th>
                        <th className="p-3 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400">
                                <div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin"/> Cargando datos...</div>
                            </td>
                        </tr>
                    ) : currentItems.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                Ningún dato disponible en esta tabla
                            </td>
                        </tr>
                    ) : (
                        currentItems.map((q, idx) => (
                            <tr key={q.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50/50 hover:bg-blue-50'}>
                                <td className="p-3 border-r border-slate-100 font-mono text-slate-500">
                                    {q.fecha ? new Date(q.fecha).toLocaleDateString('es-MX') : '-'}
                                </td>
                                <td className="p-3 border-r border-slate-100 font-bold text-slate-700 uppercase">
                                    {q.clients?.empresa || 'N/A'} 
                                    <span className="block text-[9px] text-blue-500 font-normal mt-0.5">Folio: {q.folio}</span>
                                </td>
                                <td className="p-3 border-r border-slate-100 uppercase">
                                    {q.created_by || 'Sistema'}
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => router.push(`/asesor/cotizacion/${q.id}`)}
                                            className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded hover:bg-blue-100 transition uppercase font-bold text-[10px] flex items-center gap-1"
                                        >
                                            <Eye size={12}/> Ver
                                        </button>
                                        <button 
                                            onClick={() => handleAction(q.id, 'Rechazar')}
                                            disabled={processingId === q.id}
                                            className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded hover:bg-red-100 transition uppercase font-bold text-[10px] flex items-center gap-1"
                                        >
                                            <XCircle size={12}/> Rechazar
                                        </button>
                                        <button 
                                            onClick={() => handleAction(q.id, 'Aprobar')}
                                            disabled={processingId === q.id}
                                            className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded hover:bg-emerald-100 transition uppercase font-bold text-[10px] flex items-center gap-1"
                                        >
                                            <CheckCircle size={12}/> Aprobar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* FOOTER PAGINACIÓN */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <div className="text-slate-500">
                Mostrando registros del <strong>{showStart}</strong> al <strong>{showEnd}</strong> de un total de <strong>{totalItems}</strong> registros
            </div>
            
            <div className="flex gap-1">
                <button 
                    onClick={() => setCurrentPage(1)} 
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                    Primero
                </button>
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                    Anterior
                </button>
                
                {/* Indicador numérico simple */}
                <span className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold">
                    {currentPage}
                </span>

                <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                    Siguiente
                </button>
                <button 
                    onClick={() => setCurrentPage(totalPages)} 
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                    Último
                </button>
            </div>
        </div>

      </div>
    </div>
  )
}