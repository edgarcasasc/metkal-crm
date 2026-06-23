'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  TrendingUp, Clock, CheckCircle, 
  AlertCircle, ArrowRight, Activity, Wrench, FileText
} from 'lucide-react'
import Link from 'next/link'
import { withTimeout } from '@/lib/utils'

export default function DashboardPage() {
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  
  // Datos estadísticos
  const [stats, setStats] = useState({
    pendingQuotes: 0,      // Por aprobar
    approvedMonth: 0,      // Ventas del mes
    activeOrders: 0,       // En laboratorio
    finishedMonth: 0       // Terminadas este mes
  })

  // Listas para las tablas
  const [pendingList, setPendingList] = useState<any[]>([])
  const [activeOrdersList, setActiveOrdersList] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      await withTimeout((async () => {
        // 1. CONTEOS RÁPIDOS (KPIs)
        const { count: pendingQ } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('estatus', 'En Revisión')
        const { count: approvedQ } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('estatus', 'Aprobada').gte('fecha', startOfMonth)
        const { count: activeO } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).neq('estatus', 'Terminado').neq('estatus', 'Cancelado')
        const { count: finishedO } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).eq('estatus', 'Terminado').gte('updated_at', startOfMonth)

        setStats({
          pendingQuotes: pendingQ || 0,
          approvedMonth: approvedQ || 0,
          activeOrders: activeO || 0,
          finishedMonth: finishedO || 0
        })

        // 2. LISTA: Cotizaciones por Aprobar (Prioridad Alta)
        const { data: pendingData } = await supabase
          .from('quotes')
          .select('id, folio, fecha, clients(empresa)')
          .eq('estatus', 'En Revisión')
          .order('id', { ascending: true }) // Las más viejas primero (urgencia)
          .limit(5)
        
        setPendingList(pendingData || [])

        // 3. LISTA: Órdenes en Metrología (Recientes)
        const { data: ordersData } = await supabase
          .from('service_orders')
          .select('id, folio, fecha_programada, estatus, clients(empresa)')
          .neq('estatus', 'Terminado')
          .neq('estatus', 'Cancelado')
          .order('fecha_programada', { ascending: true }) // Las más próximas a vencer primero
          .limit(5)

        setActiveOrdersList(ordersData || [])
      })(), 10000)

    } catch (error) {
      console.error("Error dashboard:", error)
      // Remove dangerous window.location.reload() which causes infinite loops
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen font-sans text-slate-600">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
           <Activity className="text-blue-600" /> Tablero General
        </h1>
        <p className="text-slate-500 font-medium">Resumen de operaciones en tiempo real</p>
      </div>

      {/* --- SECCIÓN 1: KPIs (TARJETAS DE RESUMEN) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Tarjeta 1: Por Aprobar (Atención requerida) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-amber-200 transition-all">
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Por Aprobar</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.pendingQuotes}</p>
              </div>
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <AlertCircle size={24} />
              </div>
          </div>

          {/* Tarjeta 2: Ventas del Mes (Éxito) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all">
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aprobadas (Mes)</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.approvedMonth}</p>
              </div>
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp size={24} />
              </div>
          </div>

          {/* Tarjeta 3: Carga de Trabajo (Operativo) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Laboratorio</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.activeOrders}</p>
              </div>
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Wrench size={24} />
              </div>
          </div>

          {/* Tarjeta 4: Productividad (Salidas) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terminadas (Mes)</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.finishedMonth}</p>
              </div>
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <CheckCircle size={24} />
              </div>
          </div>
      </div>

      {/* --- SECCIÓN 2: TABLAS DE ACCIÓN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TABLA IZQUIERDA: COTIZACIONES PENDIENTES */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 bg-amber-50/30 flex justify-between items-center">
                  <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm uppercase">
                      <Clock size={16} className="text-amber-500"/> Pendientes de Aprobación
                  </h3>
                  <Link href="/aprobacion" className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                      Ir a Aprobaciones <ArrowRight size={12}/>
                  </Link>
              </div>
              
              <div className="flex-1 overflow-x-auto">
                  {loading ? (
                      <div className="p-10 text-center text-slate-400 text-xs uppercase font-bold animate-pulse">Cargando datos...</div>
                  ) : pendingList.length === 0 ? (
                      <div className="p-10 text-center text-slate-300 text-xs uppercase font-bold italic">¡Excelente! No hay cotizaciones pendientes.</div>
                  ) : (
                      <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                              <tr>
                                  <th className="px-5 py-3">Folio</th>
                                  <th className="px-5 py-3">Cliente</th>
                                  <th className="px-5 py-3 text-right">Fecha</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {pendingList.map(item => (
                                  <tr key={item.id} className="hover:bg-amber-50/50 transition-colors group cursor-pointer">
                                      <td className="px-5 py-3 font-bold text-blue-600">
                                          <Link href={`/asesor/cotizacion/${item.id}`}>{item.folio}</Link>
                                      </td>
                                      <td className="px-5 py-3 font-bold text-slate-700 uppercase truncate max-w-[150px]">{item.clients?.empresa}</td>
                                      <td className="px-5 py-3 text-right font-mono text-slate-500">{new Date(item.fecha).toLocaleDateString('es-MX')}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>

          {/* TABLA DERECHA: ÓRDENES EN PROCESO */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 bg-blue-50/30 flex justify-between items-center">
                  <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm uppercase">
                      <Wrench size={16} className="text-blue-500"/> En Laboratorio (Prioridad)
                  </h3>
                  <Link href="/metrologia" className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                      Ver Tablero <ArrowRight size={12}/>
                  </Link>
              </div>

              <div className="flex-1 overflow-x-auto">
                  {loading ? (
                      <div className="p-10 text-center text-slate-400 text-xs uppercase font-bold animate-pulse">Cargando datos...</div>
                  ) : activeOrdersList.length === 0 ? (
                      <div className="p-10 text-center text-slate-300 text-xs uppercase font-bold italic">El laboratorio está libre.</div>
                  ) : (
                      <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                              <tr>
                                  <th className="px-5 py-3">Folio</th>
                                  <th className="px-5 py-3">Cliente</th>
                                  <th className="px-5 py-3">Fecha Prog.</th>
                                  <th className="px-5 py-3 text-center">Estatus</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {activeOrdersList.map(item => (
                                  <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer">
                                      <td className="px-5 py-3 font-bold text-slate-800">
                                          <Link href={`/metrologia/orden/${item.id}`}>{item.folio}</Link>
                                      </td>
                                      <td className="px-5 py-3 font-bold text-slate-600 uppercase truncate max-w-[120px]">{item.clients?.empresa}</td>
                                      <td className="px-5 py-3 font-mono text-slate-500">
                                          {item.fecha_programada ? new Date(item.fecha_programada).toLocaleDateString('es-MX') : '--'}
                                      </td>
                                      <td className="px-5 py-3 text-center">
                                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                              {item.estatus}
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>

      </div>
    </div>
  )
}