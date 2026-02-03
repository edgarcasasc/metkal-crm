'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Eye, Loader2, Calendar, Hash, User } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todas' | 'activas'>('activas');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const supabase = createClient();

  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabase
          .from('service_orders')
          .select('*, clients(empresa)')
          .order('id', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error("Error al cargar órdenes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.folio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.clients?.empresa || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filter === 'todas' ? true : (!order.no_factura || order.no_factura.trim() === '');

    return matchesSearch && matchesStatus;
  });

  const totalRows = filteredOrders.length;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);

  // Helper para renderizar estatus (reutilizable)
  const StatusBadge = ({ active, label }: { active: boolean, label?: string }) => (
    active 
      ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 uppercase tracking-wide">Activa</span>
      : <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{label}</span>
  );

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase gap-2"><Loader2 className="animate-spin" /> Cargando...</div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen font-sans text-slate-600">
      
      {/* TÍTULO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
          Órdenes {filter === 'activas' ? 'Activas' : 'Totales'}
        </h1>
        <span className="text-xs font-bold text-slate-400 uppercase md:hidden">
          {filteredOrders.length} Registros encontrados
        </span>
      </div>

      {/* CONTROLES (Adaptados para móvil: w-full y stack vertical) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl md:rounded-b-none md:rounded-t-xl border border-slate-200 md:border-b-0 shadow-sm">
        
        {/* Bloque Izquierdo: Filtros y Paginación */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          
          {/* Botones Filtro */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
            <button onClick={() => setFilter('todas')} className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${filter === 'todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Todas</button>
            <button onClick={() => setFilter('activas')} className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${filter === 'activas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Activas</button>
          </div>

          {/* Select Paginación */}
          <div className="flex items-center text-xs font-bold text-slate-500 gap-2 w-full sm:w-auto justify-center">
            <span>Mostrar</span>
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1 outline-none bg-white">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="hidden sm:inline">registros</span>
          </div>
        </div>

        {/* Bloque Derecho: Buscador */}
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar folio o cliente..." 
            className="border rounded-lg pl-9 pr-3 py-2 text-sm outline-none w-full md:w-64 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* --- VISTA ESCRITORIO (TABLA ORIGINAL) --- */}
      {/* hidden md:block asegura que en móvil desaparece y en escritorio se ve */}
      <div className="hidden md:block bg-white border border-slate-200 overflow-hidden shadow-sm rounded-b-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase text-[10px]">
            <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Folio</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentRows.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{order.created_date ? order.created_date.split(' ')[0] : 'S/F'}</td>
                <td className="px-6 py-4">
                    <span className="font-black text-blue-700 text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100">{order.folio || 'S/F'}</span>
                </td>
                <td className="px-6 py-4 uppercase text-[10px] font-bold text-slate-700">{order.clients?.empresa || 'S/N'}</td>
                <td className="px-6 py-4">
                    <StatusBadge active={!order.no_factura} label={order.no_factura} />
                </td>
                <td className="px-6 py-4 text-center">
                  <Link href={`/ordenes/${order.id}`} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                    <Eye size={14} /> Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- VISTA MÓVIL (TARJETAS) --- */}
      {/* md:hidden asegura que en escritorio desaparece */}
      <div className="md:hidden grid gap-4">
        {currentRows.map((order) => (
          <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden">
             
             {/* Borde decorativo izquierdo según estado */}
             <div className={`absolute left-0 top-0 bottom-0 w-1 ${!order.no_factura ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

             {/* Header Tarjeta */}
             <div className="flex justify-between items-start pl-2">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Hash size={10}/> Folio
                    </span>
                    <span className="font-black text-lg text-slate-800 tracking-tight">{order.folio || 'S/F'}</span>
                </div>
                <StatusBadge active={!order.no_factura} label={order.no_factura} />
             </div>

             {/* Contenido Central */}
             <div className="pl-2 space-y-2">
                <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mb-0.5">
                        <User size={10}/> Cliente
                    </span>
                    <p className="font-bold text-sm text-slate-700 uppercase leading-tight">
                        {order.clients?.empresa || 'Cliente S/N'}
                    </p>
                </div>
                <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mb-0.5">
                        <Calendar size={10}/> Fecha Ingreso
                    </span>
                    <p className="font-mono text-xs text-slate-500">
                        {order.created_date ? order.created_date.split(' ')[0] : '-'}
                    </p>
                </div>
             </div>

             {/* Footer Acción */}
             <div className="pt-3 border-t border-slate-50 pl-2">
                <Link href={`/ordenes/${order.id}`} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-lg font-bold text-xs uppercase shadow-lg shadow-slate-200 active:scale-95 transition-transform">
                    <Eye size={16} /> Ver Detalle Completo
                </Link>
             </div>
          </div>
        ))}
        
        {currentRows.length === 0 && (
            <div className="text-center p-8 text-slate-400 font-medium italic">
                No se encontraron órdenes.
            </div>
        )}
      </div>

    </div>
  );
}