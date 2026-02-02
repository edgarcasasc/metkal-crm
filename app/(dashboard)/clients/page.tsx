import Link from "next/link";
import { ClientsTable } from "@/components/ClientsTable";
import { createClient } from '@/lib/supabase/client'

export default async function Page() {
  // 1. Iniciar cliente de Supabase
  const supabase = await createClient();

  // 2. Obtener datos directos (Usando los nombres reales en español)
  const { data: rawClients, error } = await supabase
    .from('clients')
    .select('id, empresa, domicilio, municipio')
    .eq('is_active', true)
    .order('id', { ascending: false });

  if (error) {
    console.error("Error cargando clientes:", error);
  }

  // 3. Adaptador de Datos (Truco para que la tabla no se rompa)
  // Convertimos las columnas de español a lo que espera tu componente (name, address...)
  const clients = rawClients?.map((client) => ({
    id: client.id,
    name: client.empresa || "Sin Nombre",      // Mapeamos empresa -> name
    address: client.domicilio || "",           // Mapeamos domicilio -> address
    city: client.municipio || ""               // Mapeamos municipio -> city
  })) || [];

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

      {/* Componente de Tabla Interactiva */}
      <ClientsTable initialData={clients} />
      
    </div>
  );
}