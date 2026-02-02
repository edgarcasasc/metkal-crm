'use client'

import { useState } from 'react';
import Link from 'next/link';

// 1. Actualizamos el tipo con los nombres reales de tu tabla en Supabase
type Client = {
  id: number; // Tu CSV usa números (BigInt)
  empresa: string;
  domicilio: string | null;
  municipio: string | null;
  estado?: string | null;
};

export function ClientsTable({ initialData }: { initialData: Client[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 2. Lógica de Filtrado actualizada a los campos del CSV
  const filteredClients = initialData.filter(client => 
    (client.empresa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.domicilio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.municipio || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRows = filteredClients.length;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredClients.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 font-sans">
      
      {/* CONTROLES SUPERIORES */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">Mostrar</span>
          <select 
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2">registros</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Buscar:</span>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all w-64"
            placeholder="Nombre, domicilio o municipio..."
          />
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b font-bold">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Domicilio</th>
              <th className="px-4 py-3">Municipio</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentRows.length > 0 ? (
              currentRows.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900 uppercase">
                    {client.empresa}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {client.domicilio || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.municipio || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link 
                      href={`/asesor/${client.id}`}
                      className="inline-block bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition shadow-sm uppercase tracking-tighter"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                  No se encontraron registros para "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div className="mt-4 text-[11px] text-gray-500 flex justify-between items-center uppercase tracking-tight">
        <p>
          Mostrando {totalRows > 0 ? indexOfFirstRow + 1 : 0} al {Math.min(indexOfLastRow, totalRows)} de {totalRows} entradas
        </p>
        
        <div className="flex gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Anterior
          </button>
          <div className="flex items-center px-4 font-bold text-blue-600 border-t border-b bg-blue-50">
            {currentPage}
          </div>
          <button 
            disabled={indexOfLastRow >= totalRows}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}