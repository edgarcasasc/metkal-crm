'use client'

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, MapPin, Building2, ChevronRight, 
  Phone, Mail, User, Eye 
} from 'lucide-react';

interface Client {
  id: number;
  empresa: string;
  domicilio?: string;
  municipio?: string;
  estado?: string;
  contacto_nombre?: string; // Asumiendo que existen, si no, no pasa nada
  telefono?: string;
  email?: string;
}

export function ClientsTable({ initialData }: { initialData: Client[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Lógica de Filtrado
  const filteredClients = initialData.filter(client => 
    client.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.municipio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de Paginación
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredClients.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);

  return (
    <div className="space-y-4">
      
      {/* BARRA DE BÚSQUEDA Y CONTADOR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar por empresa o ciudad..." 
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase w-full md:w-auto text-right md:text-left">
            {filteredClients.length} Registros
        </div>
      </div>

      {/* --- VISTA ESCRITORIO (TABLA) --- */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Contacto Principal</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {currentRows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No se encontraron clientes.</td></tr>
            ) : (
                currentRows.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-slate-400 text-xs">#{client.id}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Building2 size={16} />
                            </div>
                            <span className="font-bold text-slate-700 uppercase">{client.empresa}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                        {client.municipio}, {client.estado}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                        {client.contacto_nombre || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <Link 
                            href={`/asesor/${client.id}`} 
                            className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:text-blue-600 hover:border-blue-200 transition shadow-sm"
                        >
                            <Eye size={14} /> Expediente
                        </Link>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- VISTA MÓVIL (TARJETAS) --- */}
      <div className="md:hidden grid gap-4">
        {currentRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
                No hay coincidencias.
            </div>
        ) : (
            currentRows.map((client) => (
            <Link key={client.id} href={`/asesor/${client.id}`} className="block">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-transform relative overflow-hidden">
                    {/* Banda lateral decorativa */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                        <div>
                            <span className="text-[10px] font-mono text-slate-400 mb-1 block">ID: #{client.id}</span>
                            <h3 className="text-lg font-black text-slate-800 leading-tight uppercase">{client.empresa}</h3>
                        </div>
                        <ChevronRight className="text-slate-300" size={20} />
                    </div>

                    <div className="pl-2 space-y-2 border-t border-slate-50 pt-3">
                        <div className="flex items-start gap-2 text-xs text-slate-600">
                            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <span>
                                {client.domicilio ? client.domicilio : ''}
                                {client.domicilio && <br/>}
                                <span className="font-bold">{client.municipio}, {client.estado}</span>
                            </span>
                        </div>
                        
                        {(client.contacto_nombre) && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <User size={14} className="text-slate-400 shrink-0" />
                                <span>{client.contacto_nombre}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Link>
            ))
        )}
      </div>

      {/* PAGINACIÓN SIMPLE */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
            <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
            >
                Anterior
            </button>
            <span className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                {currentPage} / {totalPages}
            </span>
            <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
            >
                Siguiente
            </button>
        </div>
      )}

    </div>
  );
}