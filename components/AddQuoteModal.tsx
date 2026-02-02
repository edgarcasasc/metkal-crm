'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2, FileText, Calendar, DollarSign, Truck } from 'lucide-react'

interface AddQuoteModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: number
  contacts: any[] // Recibimos los contactos del cliente para el DropList
  onSave: (newQuote: any) => void
}

export function AddQuoteModal({ isOpen, onClose, clientId, contacts, onSave }: AddQuoteModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    contact_id: '',
    lab: 'NUESTRAS INSTALACIONES', // Valor por defecto común
    moneda: 'PESOS',
    tiempo_de_entrega: '5',
    condicion_de_pago: '30',
    vigencia: '15'
  })

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (!formData.contact_id) {
        alert("Debes seleccionar un contacto")
        return
    }

    setLoading(true)
    try {
      // 1. Obtener el último folio para incrementarlo (ejemplo simple)
      const { data: lastQuote } = await supabase.from('quotes').select('folio').order('id', { ascending: false }).limit(1).single()
      const nextFolio = lastQuote ? parseInt(lastQuote.folio) + 1 : 1000
      
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          client_id: clientId,
          contact_id: parseInt(formData.contact_id),
          folio: nextFolio.toString(),
          lab: formData.lab,
          moneda: formData.moneda,
          tiempo_de_entrega: formData.tiempo_de_entrega,
          condicion_de_pago: formData.condicion_de_pago,
          vigencia: formData.vigencia,
          estatus: 'Borrador',
          fecha: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) throw error

      onSave(data)
      onClose()
      
    } catch (error: any) {
      alert("Error al crear cotización: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <FileText size={20} className="text-blue-600"/> Nueva Cotización
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
            
            {/* Contacto DropList */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto</label>
                <select 
                    name="contact_id" 
                    value={formData.contact_id} 
                    onChange={handleChange}
                    className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white transition"
                >
                    <option value="">Seleccionar contacto...</option>
                    {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
            </div>

            {/* L.A.B. DropList */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Truck size={14}/> L.A.B.
                </label>
                <select name="lab" value={formData.lab} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50">
                    <option value="NUESTRAS INSTALACIONES">NUESTRAS INSTALACIONES</option>
                    <option value="INSTALACIONES DEL CLIENTE">INSTALACIONES DEL CLIENTE</option>
                    <option value="LABORATORIO EXTERNO">LABORATORIO EXTERNO</option>
                </select>
            </div>

            {/* Moneda DropList */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <DollarSign size={14}/> Moneda
                </label>
                <select name="moneda" value={formData.moneda} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-slate-50">
                    <option value="PESOS">PESOS (MXN)</option>
                    <option value="DOLARES">DOLARES (USD)</option>
                </select>
            </div>

            {/* Inputs Numéricos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Entrega (Días)</label>
                    <input type="number" name="tiempo_de_entrega" value={formData.tiempo_de_entrega} onChange={handleChange} className="w-full border p-2 rounded text-sm font-bold text-slate-700" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pago (Días)</label>
                    <input type="number" name="condicion_de_pago" value={formData.condicion_de_pago} onChange={handleChange} className="w-full border p-2 rounded text-sm font-bold text-slate-700" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vigencia (Días)</label>
                    <input type="number" name="vigencia" value={formData.vigencia} onChange={handleChange} className="w-full border p-2 rounded text-sm font-bold text-slate-700" />
                </div>
            </div>

        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition">CANCELAR</button>
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-md disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                CREAR COTIZACIÓN
            </button>
        </div>

      </div>
    </div>
  )
}