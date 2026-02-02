'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2, Percent } from 'lucide-react'

interface EditClientModalProps {
  isOpen: boolean
  onClose: () => void
  clientData: any
  onSave: (updatedClient: any) => void
}

export function EditClientModal({ isOpen, onClose, clientData, onSave }: EditClientModalProps) {
  const supabase = createClient()
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  
  // Estado local para manejar si el checkbox está activo visualmente
  const [hasDiscount, setHasDiscount] = useState(false)

  // Cargar datos al abrir
  useEffect(() => {
    if (clientData) {
      setFormData({ ...clientData })
      // Si tiene un valor mayor a 0 o es "true"/"1", activamos el checkbox
      const discountVal = Number(clientData.cliente_con_descuento)
      setHasDiscount(discountVal > 0 || clientData.cliente_con_descuento === true || clientData.cliente_con_descuento === '1')
    }
  }, [clientData, isOpen])

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Manejador específico para el toggle de descuento
  const handleDiscountToggle = (e: any) => {
      const isChecked = e.target.checked
      setHasDiscount(isChecked)
      if (!isChecked) {
          // Si lo desmarca, reseteamos el valor a 0 en los datos
          setFormData((prev: any) => ({ ...prev, cliente_con_descuento: 0 }))
      } else {
          // Si lo marca y estaba en 0, ponemos 5 por defecto
          if (!Number(formData.cliente_con_descuento)) {
              setFormData((prev: any) => ({ ...prev, cliente_con_descuento: 5 }))
          }
      }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Preparamos el valor final del descuento
      const finalDiscount = hasDiscount ? Number(formData.cliente_con_descuento) : 0

      const { error } = await supabase
        .from('clients')
        .update({
          empresa: formData.empresa,
          domicilio: formData.domicilio,
          municipio: formData.municipio,
          estado: formData.estado,
          codigo_postal: formData.codigo_postal,
          rfc: formData.rfc,
          regimen_fiscal: formData.regimen_fiscal,
          forma_de_pago: formData.forma_de_pago,
          dias_de_credito: formData.dias_de_credito,
          cliente_con_descuento: finalDiscount, 
          tipoFecha: formData.tipoFecha
        })
        .eq('id', formData.id)

      if (error) throw error

      onSave({ ...formData, cliente_con_descuento: finalDiscount }) 
      onClose()
      alert("Cliente actualizado correctamente")
    } catch (error: any) {
      alert("Error al actualizar: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Editar Cliente</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre (Empresa)</label>
                <input type="text" name="empresa" value={formData.empresa || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition font-bold text-slate-700 uppercase" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
                <input type="text" name="domicilio" value={formData.domicilio || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition uppercase" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Municipio</label>
                <input type="text" name="municipio" value={formData.municipio || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition uppercase" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                <input type="text" name="estado" value={formData.estado || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition uppercase" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código Postal</label>
                <input type="text" name="codigo_postal" value={formData.codigo_postal || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RFC</label>
                <input type="text" name="rfc" value={formData.rfc || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition uppercase" />
            </div>

            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Régimen Fiscal</label>
                <input type="text" name="regimen_fiscal" value={formData.regimen_fiscal || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition uppercase" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma de Pago</label>
                <input type="text" name="forma_de_pago" value={formData.forma_de_pago || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition uppercase" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días de Crédito</label>
                <input type="number" name="dias_de_credito" value={formData.dias_de_credito || ''} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition" />
            </div>

            {/* SECCIÓN DE DESCUENTO - AHORA COL-SPAN-2 PARA OCUPAR TODA LA FILA */}
            <div className={`md:col-span-2 flex items-center gap-3 p-3 rounded border transition-colors ${hasDiscount ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        checked={hasDiscount} 
                        onChange={handleDiscountToggle}
                        className="w-4 h-4 text-blue-600 rounded" 
                    />
                    <label className="text-xs font-bold text-slate-700 uppercase whitespace-nowrap">Cliente con Descuento</label>
                </div>
                
                {/* Input de Porcentaje */}
                {hasDiscount && (
                    <div className="flex items-center ml-auto animate-in slide-in-from-left-2 fade-in">
                        <span className="text-xs font-bold text-blue-600 mr-2">Porcentaje:</span>
                        <div className="relative w-20">
                            <input 
                                type="number" 
                                name="cliente_con_descuento"
                                value={formData.cliente_con_descuento || ''} 
                                onChange={handleChange}
                                className="w-full border border-blue-300 rounded px-2 py-1 text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-6"
                                placeholder="0"
                            />
                            <Percent size={12} className="absolute right-2 top-2 text-blue-400"/>
                        </div>
                    </div>
                )}
            </div>

            {/* Fecha Americana - AHORA COL-SPAN-2 PARA QUEDAR ABAJO */}
            <div className="md:col-span-2 flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-100">
                <input 
                    type="checkbox" 
                    name="tipoFecha" 
                    checked={formData.tipoFecha === 'on' || formData.tipoFecha === true} 
                    onChange={(e) => setFormData({...formData, tipoFecha: e.target.checked ? 'on' : ''})}
                    className="w-4 h-4 text-blue-600 rounded" 
                />
                <label className="text-xs font-bold text-slate-700 uppercase">Fecha Americana</label>
            </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition">CANCELAR</button>
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-md disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                GUARDAR CAMBIOS
            </button>
        </div>

      </div>
    </div>
  )
}