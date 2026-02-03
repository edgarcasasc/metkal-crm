'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Eye, CheckCircle, XCircle, Loader2, Search, 
  FileText, Calendar, User, UserCheck
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
          item.created_by?.toLowerCase().includes(searchLower) || 
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
    // FIX: Padding responsivo (p-4 mobile, p-8 desktop)
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-100 min-h-screen font-sans text-slate-600">
      
      {/* HEADER + CONTADOR MÓVIL */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-2 md:mb-6">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cotizaciones por aprobar</h1>
          <span className="md:hidden text-xs font-bold text-slate-400 uppercase bg-white px-3 py-1 rounded-full w-fit shadow-sm border border-slate-200">
            {filteredData.length} Pendientes
          </span>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200">
        
        {/* CONTROLES SUPERIORES (Adaptados Mobile) */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 text-xs font-bold text-slate-500">
            
            {/* Buscador - Full width en móvil */}
            <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 p-2 md:p-0 rounded border md:border-0 border-slate-200">
                <Search size={16} className="text-slate-400 ml-2 md:ml-0" />
                <input 
                    type="text" 
                    placeholder="Buscar cliente, folio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none md:border md:border-slate-300 rounded p-1.5 w-full md:w-48 focus:ring-0 md:focus:border-blue-500 outline-none"
                />
            </div>

            {/* Selector de Registros */}
            <div className="hidden md:flex items-center gap-2">
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
        </div>

        {/* --- VISTA ESCRITORIO (TABLA INTACTA) --- */}
        {/* hidden md:block: Solo visible en pantallas medianas hacia arriba */}
        <div className="hidden md:block overflow-x-auto mb-4 border border-slate-200 rounded">
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
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin"/> Cargando...</div></td></tr>
                    ) : currentItems.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Sin cotizaciones pendientes.</td></tr>
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
                                        <button onClick={() => router.push(`/asesor/cotizacion/${q.id}`)} className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded hover:bg-blue-100 transition uppercase font-bold text-[10px] flex items-center gap-1">
                                            <Eye size={12}/> Ver
                                        </button>
                                        <button onClick={() => handleAction(q.id, 'Rechazar')} disabled={processingId === q.id} className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded hover:bg-red-100 transition uppercase font-bold text-[10px] flex items-center gap-1">
                                            <XCircle size={12}/> Rechazar
                                        </button>
                                        <button onClick={() => handleAction(q.id, 'Aprobar')} disabled={processingId === q.id} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded hover:bg-emerald-100 transition uppercase font-bold text-[10px] flex items-center gap-1">
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

        {/* --- VISTA MÓVIL (TARJETAS DE ACCIÓN) --- */}
        {/* md:hidden: Solo visible en móviles */}
        <div className="md:hidden grid gap-4 mb-6">
            {loading ? (
                <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/>Cargando...</div>
            ) : currentItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    No hay cotizaciones pendientes por revisar.
                </div>
            ) : (
                currentItems.map((q) => (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 relative overflow-hidden">
                        {/* Indicador lateral de estado */}
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-400"></div>

                        {/* Cabecera Tarjeta */}
                        <div className="flex justify-between items-start mb-3 pl-2">
                            <div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 w-fit">
                                    <FileText size={10}/> {q.folio}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                <Calendar size={10}/> {q.fecha ? new Date(q.fecha).toLocaleDateString('es-MX') : '-'}
                            </span>
                        </div>

                        {/* Cuerpo Tarjeta */}
                        <div className="pl-2 space-y-2 mb-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                                <p className="font-bold text-slate-800 text-sm uppercase">{q.clients?.empresa || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserCheck size={14} className="text-slate-400"/>
                                <p className="text-xs text-slate-600">Asesor: <span className="font-bold uppercase">{q.created_by || 'Sistema'}</span></p>
                            </div>
                        </div>

                        {/* Botones de Acción (Grandes para el dedo) */}
                        <div className="grid grid-cols-3 gap-2 pl-2 border-t border-slate-50 pt-3">
                            <button 
                                onClick={() => router.push(`/asesor/cotizacion/${q.id}`)}
                                className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-lg text-[9px] font-black uppercase hover:bg-slate-50 active:scale-95 transition"
                            >
                                <Eye size={16} /> Ver
                            </button>
                            <button 
                                onClick={() => handleAction(q.id, 'Rechazar')} 
                                disabled={processingId === q.id}
                                className="flex flex-col items-center justify-center gap-1 bg-red-50 border border-red-100 text-red-600 py-2 rounded-lg text-[9px] font-black uppercase hover:bg-red-100 active:scale-95 transition"
                            >
                                {processingId === q.id ? <Loader2 size={16} className="animate-spin"/> : <XCircle size={16} />} 
                                Rechazar
                            </button>
                            <button 
                                onClick={() => handleAction(q.id, 'Aprobar')} 
                                disabled={processingId === q.id}
                                className="flex flex-col items-center justify-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-600 py-2 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-100 active:scale-95 transition"
                            >
                                {processingId === q.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16} />}
                                Aprobar
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* FOOTER PAGINACIÓN (Responsive) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <div className="text-slate-500 text-center md:text-left">
                Mostrando <strong>{showStart}</strong> - <strong>{showEnd}</strong> de <strong>{totalItems}</strong>
            </div>
            
            <div className="flex gap-1">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1}
                    className="px-3 py-2 md:py-1.5 border rounded hover:bg-slate-100 disabled:opacity-50 font-bold"
                >
                    Anterior
                </button>
                
                <span className="px-3 py-2 md:py-1.5 bg-blue-600 text-white rounded font-bold">
                    {currentPage}
                </span>

                <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={currentPage >= totalPages}
                    className="px-3 py-2 md:py-1.5 border rounded hover:bg-slate-100 disabled:opacity-50 font-bold"
                >
                    Siguiente
                </button>
            </div>
        </div>

      </div>
    </div>
  )
}