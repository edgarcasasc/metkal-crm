'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, Save, FileText, Calendar, DollarSign, Truck } from 'lucide-react'

interface AddQuoteModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: number
  contacts: any[]
  onSave: () => void
}

export function AddQuoteModal({ isOpen, onClose, clientId, contacts, onSave }: AddQuoteModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  // Estados INDIVIDUALES para mejor control
  const [contactId, setContactId] = useState('')
  const [moneda, setMoneda] = useState('PESOS')
  // IMPORTANTE: Valores iniciales numéricos simples (sin guiones)
  const [tiempoEntrega, setTiempoEntrega] = useState('5') 
  const [condicionPago, setCondicionPago] = useState('30')
  const [vigencia, setVigencia] = useState('15')
  const [lab, setLab] = useState('NUESTRAS INSTALACIONES')
  const [folio, setFolio] = useState('')

  // Calcular Folio al abrir
  useEffect(() => {
    if (isOpen) {
      generateFolio()
    }
  }, [isOpen])

  const generateFolio = async () => {
    const year = new Date().getFullYear().toString().slice(-2)
    
    // CORRECCIÓN NaN: Usamos 'exact' y manejamos el null
    const { count, error } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })

    if (error) {
        console.error("Error contando:", error)
        setFolio(`C-MK-${year}/0001`) // Fallback seguro
        return
    }

    // Si count es null, usamos 0. Así evitamos el NaN.
    const currentCount = count || 0; 
    const nextId = currentCount + 1;

    setFolio(`C-MK-${year}/${nextId.toString().padStart(4, '0')}`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contactId) {
        alert("Selecciona un contacto")
        return
    }

    setLoading(true)

    try {
        const { error } = await supabase.from('quotes').insert({
            client_id: clientId,
            contact_id: Number(contactId),
            folio: folio,
            fecha: new Date().toISOString(),
            moneda,
            lab,
            estatus: 'Borrador',
            created_by: 'Asesor',
            
            // ✅ CORRECCIÓN CRÍTICA: Convertimos a Number() explícitamente
            // Si la base de datos espera INT, no podemos mandar strings
            tiempo_de_entrega: Number(tiempoEntrega),
            condicion_de_pago: Number(condicionPago),
            vigencia: Number(vigencia),
        })

        if (error) throw error

        onSave()
        onClose()
        setContactId('') // Reset
        
    } catch (error: any) {
        alert('Error: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <FileText size={20} className="text-blue-600"/> Nueva Cotización
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Folio Display */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Folio Asignado</label>
                <div className="text-xl font-black text-blue-700 tracking-widest font-mono">
                    {folio || <Loader2 className="animate-spin inline"/>}
                </div>
            </div>

            {/* Contacto */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto</label>
                <select 
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                >
                    <option value="">Seleccionar contacto...</option>
                    {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
            </div>

            {/* L.A.B. y Moneda */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <Truck size={14}/> L.A.B.
                    </label>
                    <select value={lab} onChange={e => setLab(e.target.value)} className="w-full border p-2 rounded text-sm bg-white">
                        <option value="NUESTRAS INSTALACIONES">NUESTRAS INSTALACIONES</option>
                        <option value="INSTALACIONES DEL CLIENTE">INSTALACIONES DEL CLIENTE</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <DollarSign size={14}/> Moneda
                    </label>
                    <select value={moneda} onChange={e => setMoneda(e.target.value)} className="w-full border p-2 rounded text-sm bg-white">
                        <option value="PESOS">PESOS (MXN)</option>
                        <option value="DOLARES">DOLARES (USD)</option>
                    </select>
                </div>
            </div>

            {/* Inputs Numéricos */}
            <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Entrega (Días)</label>
                    <input 
                        type="number" 
                        min="0"
                        value={tiempoEntrega} 
                        onChange={e => setTiempoEntrega(e.target.value)} 
                        className="w-full border p-2 rounded text-sm font-bold text-slate-700 text-center" 
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pago (Días)</label>
                    <input 
                        type="number"
                        min="0" 
                        value={condicionPago} 
                        onChange={e => setCondicionPago(e.target.value)} 
                        className="w-full border p-2 rounded text-sm font-bold text-slate-700 text-center" 
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vigencia (Días)</label>
                    <input 
                        type="number" 
                        min="0"
                        value={vigencia} 
                        onChange={e => setVigencia(e.target.value)} 
                        className="w-full border p-2 rounded text-sm font-bold text-slate-700 text-center" 
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition">CANCELAR</button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-md disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                    CREAR
                </button>
            </div>

        </form>
      </div>
    </div>
  )
}