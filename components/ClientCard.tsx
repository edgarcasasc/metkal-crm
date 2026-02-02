'use client' // 👈 Importante: Esto lo convierte en componente interactivo

import { useState } from 'react';
import { updateClient, deleteClient } from '@/app/actions/client-actions';

interface ClientProps {
  id: string;
  name: string;
  email: string;
}

export function ClientCard({ id, name, email }: ClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentName, setCurrentName] = useState(name);

  // Manejador de Edición
  const handleUpdate = async (formData: FormData) => {
    setIsLoading(true);
    await updateClient(formData);
    setIsEditing(false);
    setIsLoading(false);
  };

  // Manejador de Eliminación
  const handleDelete = async () => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      setIsLoading(true);
      await deleteClient(id);
      // No necesitamos setIsLoading(false) porque el componente desaparecerá
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      {isEditing ? (
        // --- MODO EDICIÓN ---
        <form action={handleUpdate} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          
          <div>
            <label className="text-xs text-gray-500">Nombre</label>
            <input
              name="name"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-black outline-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded text-sm hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        // --- MODO VISUALIZACIÓN ---
        <>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{name}</h3>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
              Activo
            </span>
          </div>
          
          <div className="border-t mt-4 pt-3 flex justify-end gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Editar
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="text-sm text-red-600 hover:text-red-800 font-medium hover:underline disabled:opacity-50"
            >
              {isLoading ? '...' : 'Eliminar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}