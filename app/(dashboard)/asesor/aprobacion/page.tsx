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
  const [processingId, setProcessingId] = useState<number | null>(null) // Para evitar doble clic

  useEffect(() => {
    fetchPendingQuotes()
  }, [])

  async function fetchPendingQuotes() {
    setLoading(true)
    try {
      // Traemos cotizaciones en estatus 'En Revisión'
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

  // --- LÓGICA CORE: APROBAR Y CREAR ORDEN ---
  const handleApprove = async (quote: any) => {
      if (!confirm("¿Aprobar esta cotización? Se generará automáticamente la Orden de Servicio para Metrología.")) return
      
      setProcessingId(quote.id)

      try {
          // 1. Obtener los productos de esta cotización
          const { data: quoteItems, error: itemsError } = await supabase
              .from('quote_items')
              .select('*')
              .eq('cotizacion_id', quote.id)
          
          if (itemsError) throw itemsError
          if (!quoteItems || quoteItems.length === 0) throw new Error("La cotización no tiene productos.")

          // 2. Generar Folio de Orden (OS-MK-YY/XXXX)
          const year = new Date().getFullYear().toString().slice(-2)
          const { count } = await supabase.from('service_orders').select('*', { count: 'exact', head: true })
          const nextNum = (count || 0) + 1
          const folioOrden = `OS-MK-${year}/${nextNum.toString().padStart(4, '0')}`

          // 3. Crear la Orden de Servicio (Cabecera)
          const { data: orderData, error: orderError } = await supabase.from('service_orders').insert({
              cotizacion_id: quote.id,
              client_id: quote.client_id,
              contact_id: quote.contact_id,
              folio: folioOrden,
              fecha_programada: new Date().toISOString(), // Fecha hoy
              estatus: 'En Proceso', // IMPORTANTE: Para que salga en el dashboard del metrólogo
              tipo_orden: 'Laboratorio', 
              metrologo: null 
          }).select().single()

          if (orderError) throw orderError

          // 4. Mover los items a la Orden
          const orderItems = quoteItems.map(item => ({
              orden_id: orderData.id,
              equipo: item.equipo,
              marca: item.marca,
              modelo: item.modelo,
              no_serie: item.no_serie,
              identificacion: item.identificacion,
              servicio: item.servicio,
              estatus_tecnico: 'Pendiente' // Estado inicial para el técnico
          }))

          const { error: insertItemsError } = await supabase.from('service_order_items').insert(orderItems)
          if (insertItemsError) throw insertItemsError

          // 5. Finalmente, actualizar estatus de la cotización a Aprobada
          const { error: updateError } = await supabase
              .from('quotes')
              .update({ estatus: 'Aprobada' })
              .eq('id', quote.id)

          if (updateError) throw updateError

          // Éxito
          alert(`✅ Cotización Aprobada.\n📄 Se generó la Orden: ${folioOrden}\n🚀 Enviada a Metrología.`)
          setQuotes(prev => prev.filter(q => q.id !== quote.id))

      } catch (e: any) {
          alert("Error al aprobar: " + e.message)
      } finally {
          setProcessingId(null)
      }
  }

  const handleReject = async (quoteId: number) => {
      if (!confirm("¿Rechazar cotización y devolver a borrador?")) return
      setProcessingId(quoteId)
      try {
          const { error } = await supabase
            .from('quotes')
            .update({ estatus: 'Borrador' })
            .eq('id', quoteId)

          if (error) throw error
          setQuotes(prev => prev.filter(q => q.id !== quoteId))
          alert("Cotización rechazada y devuelta al asesor.")
      } catch (e: any) {
          alert("Error: " + e.message)
      } finally {
          setProcessingId(null)
      }
  }

  // Filtrado visual
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
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase">Gerencia Técnica / Calidad</p>
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
                  <p className="font-bold text-sm uppercase">Todo al día. No hay pendientes.</p>
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
                              <th className="px-6 py-4 text-center">Decisión</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredQuotes.map((q) => (
                              <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="px-6 py-4 font-black text-blue-700 text-sm">{q.folio}</td>
                                  <td className="px-6 py-4 uppercase font-bold text-slate-700">{q.clients?.empresa || 'S/N'}</td>
                                  <td className="px-6 py-4 font-mono text-slate-500">{q.fecha ? new Date(q.fecha).toLocaleDateString('es-MX') : '-'}</td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1">
                                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] w-fit font-bold">Pago: {q.condicion_de_pago} días</span>
                                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] w-fit font-bold">Entrega: {q.tiempo_de_entrega} días</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex justify-center gap-2">
                                          {/* VER */}
                                          <button 
                                            onClick={() => router.push(`/asesor/cotizacion/${q.id}`)}
                                            className="bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 p-2 rounded-lg transition shadow-sm"
                                            title="Ver Detalle"
                                          >
                                              <Eye size={16}/>
                                          </button>
                                          
                                          {/* RECHAZAR */}
                                          <button 
                                            onClick={() => handleReject(q.id)}
                                            disabled={processingId === q.id}
                                            className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition font-bold flex items-center gap-1 disabled:opacity-50"
                                            title="Rechazar"
                                          >
                                              <XCircle size={16}/>
                                          </button>

                                          {/* APROBAR (Aquí ocurre la magia) */}
                                          <button 
                                            onClick={() => handleApprove(q)}
                                            disabled={processingId === q.id}
                                            className="bg-emerald-500 text-white hover:bg-emerald-600 p-2 rounded-lg transition font-bold flex items-center gap-2 shadow-md shadow-emerald-200 disabled:opacity-50"
                                            title="Aprobar y Generar Orden"
                                          >
                                              {processingId === q.id ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                                              APROBAR
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