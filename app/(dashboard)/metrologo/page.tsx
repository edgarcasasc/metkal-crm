'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Search, Calendar, MapPin, Wrench, CheckCircle, 
  Clock, ChevronRight
} from 'lucide-react'
import Link from 'next/link'

export default function MetrologyDashboard() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'asignadas' | 'todas'>('todas')
  const [searchTerm, setSearchTerm] = useState('')

  // Simulación de usuario logueado (puedes conectarlo con tu auth real después)
  const currentUser = "Enrique Casas" 

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  async function fetchWorkOrders() {
    setLoading(true)
    try {
      // 1. Obtener Órdenes (Solo la tabla principal para evitar errores de JOIN)
      const { data: ordersData, error: ordersError } = await supabase
        .from('service_orders')
        .select('*')
        .order('fecha_programada', { ascending: true })

      if (ordersError) throw ordersError
      if (!ordersData) return

      // 2. Obtener Clientes (Manualmente)
      const clientIds = [...new Set(ordersData.map(o => o.client_id).filter(Boolean))]
      let clientsMap: Record<number, any> = {}
      
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
            .from('clients')
            .select('id, empresa, domicilio, ciudad')
            .in('id', clientIds)
        
        if (clientsData) {
            clientsData.forEach(c => clientsMap[c.id] = c)
        }
      }

      // 3. Obtener Conteo de Equipos (Manualmente)
      const orderIds = ordersData.map(o => o.id)
      let countsMap: Record<number, number> = {}

      if (orderIds.length > 0) {
         // Traemos solo los IDs para contar rápido
         const { data: itemsData } = await supabase
            .from('service_order_items') // Confirmado que este es el nombre correcto
            .select('orden_id')
            .in('orden_id', orderIds)
         
         if (itemsData) {
             itemsData.forEach(item => {
                 countsMap[item.orden_id] = (countsMap[item.orden_id] || 0) + 1
             })
         }
      }

      // 4. Unir todo en el cliente
      const mergedOrders = ordersData.map(order => ({
          ...order,
          clients: clientsMap[order.client_id] || {}, // Datos del cliente o vacío
          itemCount: countsMap[order.id] || 0         // Conteo de equipos o 0
      }))

      setOrders(mergedOrders)

    } catch (error: any) {
      console.error("Error detallado:", error.message || error)
    } finally {
      setLoading(false)
    }
  }

  // --- LÓGICA DE FILTRADO ---
  const filteredOrders = orders.filter(order => {
    // 1. Filtro de Texto
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (order.folio || '').toLowerCase().includes(searchLower) ||
      (order.clients?.empresa || '').toLowerCase().includes(searchLower) ||
      (order.clients?.ciudad || '').toLowerCase().includes(searchLower)

    // 2. Filtro de Asignación
    const matchesAssignment = filter === 'todas' 
        ? true 
        : order.metrologo?.toLowerCase() === currentUser.toLowerCase()

    return matchesSearch && matchesAssignment 
  })

  // Colores de estado según fecha
  const getStatusColor = (dateString: string) => {
      if (!dateString) return "border-l-4 border-slate-300" // Sin fecha
      const today = new Date()
      const progDate = new Date(dateString)
      // Normalizamos a medianoche para comparar días enteros
      today.setHours(0,0,0,0)
      progDate.setHours(0,0,0,0)
      
      const diffTime = progDate.getTime() - today.getTime()
      const diffDays = diffTime / (1000 * 3600 * 24)

      if (diffDays < 0) return "border-l-4 border-red-500 bg-red-50" // Vencida
      if (diffDays <= 2) return "border-l-4 border-amber-500 bg-amber-50" // Próxima
      return "border-l-4 border-emerald-500" // A tiempo
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-100 min-h-screen font-sans text-slate-600">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Wrench className="text-blue-600" />
                Panel de Trabajo
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                Programación de Servicios Técnicos
            </p>
          </div>
          
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-center">
              <span className="block text-xl font-black text-blue-600">{filteredOrders.length}</span>
              <span className="text-[9px] uppercase font-bold text-slate-400">Órdenes Activas</span>
          </div>
      </div>

      {/* CONTROLES */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setFilter('todas')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${filter === 'todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                Todo el Taller
            </button>
            <button onClick={() => setFilter('asignadas')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${filter === 'asignadas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                Mis Asignaciones
            </button>
        </div>

        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
            <input 
                type="text" 
                placeholder="Buscar por folio, cliente o ciudad..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* GRID DE TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
             <div className="col-span-3 text-center py-20 text-slate-400 font-bold uppercase flex justify-center gap-2">
                <Clock className="animate-spin"/> Cargando programación...
             </div>
        ) : filteredOrders.length === 0 ? (
             <div className="col-span-3 text-center py-20 bg-white rounded-lg border border-slate-200 border-dashed">
                <CheckCircle size={48} className="mx-auto text-emerald-200 mb-2"/>
                <p className="font-bold text-slate-400 uppercase">¡Todo al día! No hay órdenes pendientes.</p>
             </div>
        ) : (
            filteredOrders.map(order => (
                <Link key={order.id} href={`/metrologo/orden/${order.id}`} className="group">
                    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-5 border border-slate-200 relative overflow-hidden ${getStatusColor(order.fecha_programada)}`}>
                        
                        <div className="absolute top-4 right-4">
                            {order.tipo_orden === 'Sitio' ? (
                                <span className="bg-purple-100 text-purple-700 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wide">Sitio</span>
                            ) : (
                                <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wide">Laboratorio</span>
                            )}
                        </div>

                        <div className="mb-4 pr-12">
                            <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">Folio: {order.folio}</span>
                            <h3 className="font-black text-slate-800 text-lg leading-tight mt-1 truncate">
                                {order.clients?.empresa || 'Cliente Desconocido'}
                            </h3>
                            <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                                <MapPin size={12}/>
                                <span className="uppercase font-bold text-[10px]">{order.clients?.ciudad || 'Ubicación no especificada'}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded p-3 grid grid-cols-2 gap-2 text-[10px] border border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                            <div>
                                <span className="block font-bold text-slate-400 uppercase text-[9px]">Fecha Programada</span>
                                <div className="flex items-center gap-1 font-bold text-slate-700 mt-0.5">
                                    <Calendar size={12} className="text-blue-500"/>
                                    {order.fecha_programada ? new Date(order.fecha_programada).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : <span className="text-slate-400 italic">Por definir</span>}
                                </div>
                            </div>
                            <div>
                                <span className="block font-bold text-slate-400 uppercase text-[9px]">Carga</span>
                                <div className="flex items-center gap-1 font-bold text-slate-700 mt-0.5">
                                    <Wrench size={12} className="text-amber-500"/>
                                    {order.itemCount} Equipos
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-3">
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                    {order.metrologo ? order.metrologo.substring(0,2) : '?'}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[100px]">
                                    {order.metrologo || 'Sin Asignar'}
                                </span>
                             </div>
                             <div className="text-blue-600 font-bold text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                                Trabajar <ChevronRight size={14}/>
                             </div>
                        </div>

                    </div>
                </Link>
            ))
        )}
      </div>
    </div>
  )
}