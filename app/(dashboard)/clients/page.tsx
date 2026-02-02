import { db } from "@/lib/db";
import Link from "next/link";
import { ClientsTable } from "@/components/ClientsTable"; // Importamos la tabla

export default async function Page() {
  // 1. Obtener datos desde Prisma (Solo activos)
  // Seleccionamos solo los campos que necesitamos para ser más eficientes
  const clients = await db.clients.findMany({
    where: { 
      is_active: true 
    },
    orderBy: { 
      created_at: 'desc' 
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Encabezado con Botón Crear */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Listado de Clientes</h1>
        
        <Link 
          href="/dashboard/clients/new" 
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium"
        >
          <span>+</span> Crear Nuevo Cliente
        </Link>
      </div>

      {/* Componente de Tabla Interactiva (Buscador/Paginación) */}
      <ClientsTable initialData={clients} />
      
    </div>
  );
}