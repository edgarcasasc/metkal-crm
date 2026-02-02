// app/actions/client-actions.ts
'use server'

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db'; 
import { z } from 'zod'; 

// Esquema de validación
const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

type ActionState = {
  success?: boolean;
  error?: string;
};

// 1. EDITAR CLIENTE
export async function updateClient(formData: FormData): Promise<ActionState> {
  const data = {
    id: formData.get('id'),
    name: formData.get('name'),
  };

  const validated = ClientSchema.safeParse(data);
  
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    // ✅ CORRECCIÓN: Usamos 'db.clients' (plural) porque así se llama en tu schema
    await db.clients.update({
      where: { id: validated.data.id },
      data: { name: validated.data.name },
    });
    
    revalidatePath('/dashboard/clients');
    return { success: true };
  } catch (error) {
    console.error("Database Error:", error);
    return { error: 'Error al actualizar el cliente' };
  }
}

// 2. ELIMINAR CLIENTE (Soft Delete)
export async function deleteClient(clientId: string): Promise<ActionState> {
  if (!clientId) return { error: "ID no válido" };

  try {
    // ✅ CORRECCIÓN: Usamos 'db.clients' (plural)
    await db.clients.update({
      where: { id: clientId },
      data: { is_active: false }, // Esto ahora funciona perfecto
    });
    
    revalidatePath('/dashboard/clients');
    return { success: true };
  } catch (error) {
    console.error("Database Error:", error);
    return { error: 'No se pudo eliminar el cliente' };
  }
}