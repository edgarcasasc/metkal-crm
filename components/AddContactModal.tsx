'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2, User, Mail, Phone, Edit } from 'lucide-react'

interface AddContactModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: number
  contactToEdit?: any // Prop opcional: Si existe, estamos editando
  onSave: (contact: any) => void
}

export function AddContactModal({ isOpen, onClose, clientId, contactToEdit, onSave }: AddContactModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    telefono: ''
  })

  // Efecto: Cuando se abre el modal, decidimos si llenar datos (Editar) o limpiar (Nuevo)
  useEffect(() => {
    if (isOpen) {
        if (contactToEdit) {
            setFormData({
                nombre: contactToEdit.nombre || '',
                correo: contactToEdit.correo || '',
                telefono: contactToEdit.telefono || ''
            })
        } else {
            setFormData({ nombre: '', correo: '', telefono: '' })
        }
    }
  }, [isOpen, contactToEdit])

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (!formData.nombre) {
        alert("El nombre es obligatorio")
        return
    }

    setLoading(true)
    try {
      let result;

      if (contactToEdit) {
          // MODO EDICIÓN (UPDATE)
          result = await supabase
            .from('contacts')
            .update({
                nombre: formData.nombre.toUpperCase(),
                correo: formData.correo,
                telefono: formData.telefono
            })
            .eq('id', contactToEdit.id)
            .select()
            .single()
      } else {
          // MODO CREACIÓN (INSERT)
          result = await supabase
            .from('contacts')
            .insert({
                client_id: clientId,
                nombre: formData.nombre.toUpperCase(),
                correo: formData.correo,
                telefono: formData.telefono
            })
            .select()
            .single()
      }

      if (result.error) throw result.error

      onSave(result.data) // Enviamos el dato actualizado/nuevo al padre
      onClose()
      
    } catch (error: any) {
      alert("Error al guardar contacto: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
            {contactToEdit ? <Edit size={20} className="text-amber-500"/> : <User size={20} className="text-blue-600"/>}
            {contactToEdit ? 'Editar Contacto' : 'Nuevo Contacto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                <div className="relative">
                    <User size={16} className="absolute left-3 top-3 text-slate-400"/>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border p-2 pl-9 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" placeholder="NOMBRE COMPLETO" autoFocus/>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo</label>
                <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-slate-400"/>
                    <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full border p-2 pl-9 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase" placeholder="correo@ejemplo.com"/>
                </div>
            </div>
            {/* Teléfono destacado en azul */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular</label>
                <div className="relative">
                    <Phone size={18} className="absolute left-3 top-3.5 text-blue-600"/>
                    <input 
                        type="tel" 
                        name="telefono" 
                        value={formData.telefono} 
                        onChange={handleChange} 
                        className="w-full border border-blue-200 p-2.5 pl-10 rounded text-lg font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30 placeholder-blue-300" 
                        placeholder="(000) 000-0000"
                    />
                </div>
            </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition">CANCELAR</button>
            <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-md disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} GUARDAR
            </button>
        </div>
      </div>
    </div>
  )
}