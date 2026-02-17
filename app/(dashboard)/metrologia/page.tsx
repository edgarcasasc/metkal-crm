'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client' 
import { 
  Search, Eye, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, FileText, Loader2, Archive, CheckCircle2, Clock, Microscope, ArrowRight, Calendar
} from 'lucide-react'
import Link from 'next/link'

export default function MetrologyTable() {
  const supabase = createClient()
  
  // Datos
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Paginación y Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // NUEVO: ESTADO DE PESTAÑAS (ACTIVA / HISTORIAL)
  const [view, setView] = useState<'active' | 'history'>('active')

  useEffect(() => {
    fetchOrders()
  }, [view]) // Recargar cuando cambie la pestaña

  async function fetchOrders() {
    setLoading(true)
    try {
      let query = supabase
        .from('service_orders')
        .select(`*, clients ( id, empresa )`)
        .eq('tipo_orden', 'Laboratorio')
        .order('fecha_programada', { ascending: true })

      // FILTRO SEGÚN PESTAÑA
      if (view === 'active') {
          query = query.neq('estatus', 'Terminado').neq('estatus', 'Cancelado')
      } else {
          // Historial muestra Terminados y Cancelados
          query = query.in('estatus', ['Terminado', 'Cancelado']).order('fecha_entrega', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])

    } catch (error: any) {
      console.error("Error:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- LÓGICA DE FILTRADO ---
  const filteredData = orders.filter(order => {
    const term = searchTerm.toLowerCase()
    const folio = order.folio?.toLowerCase() || ''
    const cliente = order.clients?.empresa?.toLowerCase() || ''
    const fecha = order.fecha_programada || ''
    
    return folio.includes(term) || cliente.includes(term) || fecha.includes(term)
  })

  // --- LÓGICA DE PAGINACIÓN ---
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const formatDate = (dateString: string) => {
      if (!dateString) return 'S/F'
      const [year, month, day] = dateString.split('T')[0].split('-')
      return `${day}/${month}/${year}`
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-slate-100 min-h-screen font-sans text-slate-600">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Microscope className="text-blue-600"/> Tablero de Metrología
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de calibraciones y asignación técnica.</p>
        </div>
        
        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
                onClick={() => { setView('active'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition flex items-center gap-2 
                    ${view === 'active' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Clock size={14}/> En Proceso
            </button>
            <button 
                onClick={() => { setView('history'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition flex items-center gap-2 
                    ${view === 'history' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Archive size={14}/> Historial
            </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        
        {/* CONTROLES SUPERIORES */}
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Mostrar</span>
                <select className="border border-slate-300 rounded p-1 focus:outline-none focus:border-blue-500" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
                <span>registros</span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-sm font-bold">Buscar:</span>
                <div className="relative w-full md:w-64">
                    <input type="text" className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 uppercase" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                    <Search className="absolute right-2 top-2 text-slate-400" size={16}/>
                </div>
            </div>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">{view === 'history' ? 'Fecha Cierre' : 'Fecha Prog.'}</th>
                        <th className="px-4 py-3">Folio</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Estatus</th>
                        <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline mr-2"/> Cargando datos...</td></tr>
                    ) : currentData.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No se encontraron registros en {view === 'active' ? 'Proceso' : 'Historial'}</td></tr>
                    ) : (
                        currentData.map((order) => (
                            <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-slate-500">
                                    {view === 'history' && order.fecha_entrega ? formatDate(order.fecha_entrega) : formatDate(order.fecha_programada)}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-800">{order.folio}</td>
                                <td className="px-4 py-3 uppercase text-xs font-bold text-slate-600 truncate max-w-[250px]">
                                    {order.clients?.empresa || <span className="text-red-400 italic">Cliente no vinculado</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                                        ${order.estatus === 'Terminado' ? 'bg-emerald-100 text-emerald-700' : 
                                          order.estatus === 'Cancelado' ? 'bg-red-100 text-red-700' :
                                          'bg-blue-100 text-blue-700'}
                                    `}>
                                        {order.estatus || 'ACTIVA'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Link href={`/metrologia/orden/${order.id}`} className="inline-flex items-center gap-1 text-slate-600 font-bold text-xs hover:text-blue-600">
                                        <Eye size={14}/> Ver
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="text-slate-500">Mostrando {currentData.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + rowsPerPage, filteredData.length)} de {filteredData.length} registros</div>
            <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronsLeft size={16}/></button>
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 rounded hover:bg-slate-200 disabled:opacity-30">Anterior</button>
                <span className="bg-blue-600 text-white px-3 py-1 rounded font-bold">{currentPage}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 rounded hover:bg-slate-200 disabled:opacity-30">Siguiente</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronsRight size={16}/></button>
            </div>
        </div>

      </div>
    </div>
  )
}