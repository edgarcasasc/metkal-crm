import Link from "next/link";
import { ClientsTable } from "@/components/ClientsTable";
import { createClient } from "@/lib/supabase/server"; 
import { cookies } from "next/headers";

export default async function AsesorPage() {
  // 1. En Next.js 15, cookies y el cliente deben llevar 'await'
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore); // <--- AQUÍ FALTABA EL AWAIT

  // 2. Traer los datos con los nombres de tu CSV
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, empresa, domicilio, municipio, estado')
    // Nota: Como acabamos de crear la tabla, 'is_active' es true por defecto
    .order('id', { ascending: true }); 

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          <p className="font-bold">Error al conectar con Supabase:</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Listado de Clientes</h1>
        <Link 
          href="/asesor/new" 
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition text-sm font-medium"
        >
          + Crear Nuevo Cliente
        </Link>
      </div>

      {/* Enviamos los datos a la tabla interactiva */}
      <ClientsTable initialData={clients || []} />
      
      <p className="text-xs text-gray-400">
        Base de datos: {clients?.length || 0} registros encontrados.
      </p>
    </div>
  );
}