import { ClientsTable } from "@/components/ClientsTable";
import { NewClientButton } from "@/components/NewClientButton"; // <--- IMPORTAR AQUÍ
import { createClient } from "@/lib/supabase/server"; 
import { cookies } from "next/headers";
import { Users } from "lucide-react";

export default async function AsesorPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('empresa', { ascending: true });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <p className="font-bold">Error de conexión:</p>
          <p className="text-sm font-mono">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header Responsivo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Users className="text-blue-600" />
                Cartera de Clientes
            </h1>
            <p className="text-slate-500 font-medium text-sm">Gestiona expedientes y contactos</p>
        </div>
        
        {/* Aquí usamos el componente Botón+Modal en lugar del Link */}
        <NewClientButton />
        
      </div>

      <ClientsTable initialData={clients || []} />
      
    </div>
  );
}