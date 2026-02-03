'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, Save, Building2, MapPin } from 'lucide-react'

export function NewClientButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    empresa: '',
    domicilio: '',
    municipio: '',
    estado: 'Nuevo León' // Valor por defecto común
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('clients')
        .insert([{
            empresa: formData.empresa.toUpperCase(), // Guardamos en mayúsculas
            domicilio: formData.domicilio.toUpperCase(),
            municipio: formData.municipio.toUpperCase(),
            estado: formData.estado.toUpperCase(),
            is_active: true
        }])

      if (error) throw error

      // Éxito
      setIsOpen(false)
      setFormData({ empresa: '', domicilio: '', municipio: '', estado: 'Nuevo León' }) // Reset
      router.refresh() // Recarga los datos de la página de fondo sin navegar
      
    } catch (error: any) {
      alert('Error al crear cliente: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* BOTÓN DISPARADOR (Igual al diseño que tenías) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg shadow-slate-300 hover:bg-black transition text-xs font-bold uppercase flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Nuevo Cliente
      </button>

      {/* MODAL (Portal) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 border border-slate-200">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Building2 className="text-blue-600" size={20}/>
                    Nuevo Cliente
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                    <X size={20}/>
                </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Razón Social / Empresa <span className="text-red-500">*</span></label>
                    <input 
                        required 
                        autoFocus
                        type="text" 
                        placeholder="Ej. ACEROS DE MÉXICO S.A. DE C.V."
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase font-bold text-slate-700"
                        value={formData.empresa}
                        onChange={e => setFormData({...formData, empresa: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 flex items-center gap-1"><MapPin size={12}/> Dirección Fiscal</label>
                    <textarea 
                        rows={2}
                        placeholder="Calle, Número, Colonia..."
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase resize-none"
                        value={formData.domicilio}
                        onChange={e => setFormData({...formData, domicilio: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Municipio</label>
                        <input 
                            type="text" 
                            placeholder="MONTERREY"
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase"
                            value={formData.municipio}
                            onChange={e => setFormData({...formData, municipio: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Estado</label>
                        <input 
                            type="text" 
                            placeholder="NUEVO LEÓN"
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase"
                            value={formData.estado}
                            onChange={e => setFormData({...formData, estado: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button 
                        type="button" 
                        onClick={() => setIsOpen(false)} 
                        className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-50 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-black transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                        Guardar
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}