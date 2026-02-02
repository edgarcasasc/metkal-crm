'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Eye, Loader2 } from 'lucide-react';
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
    
    // Activas = Sin factura
    const matchesStatus = filter === 'todas' ? true : (!order.no_factura || order.no_factura.trim() === '');

    return matchesSearch && matchesStatus;
  });

  const totalRows = filteredOrders.length;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase gap-2"><Loader2 className="animate-spin" /> Cargando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen font-sans text-slate-600">
      <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Órdenes {filter === 'activas' ? 'Activas' : 'Totales'}</h1>

      {/* CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-t-xl border border-slate-200 border-b-0 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center text-xs font-bold text-slate-500 gap-2">
            <span>Mostrar</span>
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1 outline-none">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>registros</span>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setFilter('todas')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${filter === 'todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Todas</button>
            <button onClick={() => setFilter('activas')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${filter === 'activas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Activas</button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2 text-slate-400" size={16} />
          <input type="text" placeholder="Buscar..." className="border rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none w-64 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm rounded-b-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase text-[10px]">
            <tr><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Folio</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">Estatus</th><th className="px-6 py-4 text-center">Acción</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentRows.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{order.created_date ? order.created_date.split(' ')[0] : 'S/F'}</td>
                <td className="px-6 py-4"><span className="font-black text-blue-700 text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100">{order.folio || 'S/F'}</span></td>
                <td className="px-6 py-4 uppercase text-[10px] font-bold text-slate-700">{order.clients?.empresa || 'S/N'}</td>
                <td className="px-6 py-4">{!order.no_factura ? <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 uppercase">Activa</span> : <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{order.no_factura}</span>}</td>
                <td className="px-6 py-4 text-center">
                  {/* AQUÍ ESTÁ EL CAMBIO IMPORTANTE: Redirige a la subcarpeta [id] */}
                  <Link href={`/ordenes/${order.id}`} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:text-blue-600 transition-all shadow-sm"><Eye size={14} /> Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}