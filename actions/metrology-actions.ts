'use server'

import { createClient } from '@/lib/supabase/server' 
import { revalidatePath } from 'next/cache'

export async function saveMeasurement(formData: any) {
  const supabase = await createClient()
  
  // 1. Obtener usuario (Simulado o Real)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // 2. Preparar el payload JSON
  const measurementData = {
      service_order_item_id: formData.itemId,
      metrologist_id: user?.id || null, 
      magnitude: formData.magnitude,
      temperature: formData.envTemp,
      humidity: formData.envHum,
      result: formData.result,
      data: {
          readings: formData.readings,
          config: formData.config,
          stats: formData.stats || {}
      }
  }

  // 3. Insertar en DB
  const { error } = await supabase
      .from('measurements')
      .insert(measurementData)

  if (error) {
      console.error('Error DB:', error)
      return { success: false, message: 'Error al guardar: ' + error.message }
  }

  // 4. Actualizar estatus del Item
  await supabase
      .from('service_order_items')
      .update({ estatus_tecnico: 'Terminado' })
      .eq('id', formData.itemId)

  // 5. Revalidar para actualizar la UI
  if (formData.orderId) {
    revalidatePath(`/metrologia/orden/${formData.orderId}`)
  }
  
  return { success: true, message: 'Medición guardada correctamente' }
}