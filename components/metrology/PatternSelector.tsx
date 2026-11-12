'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, XCircle } from 'lucide-react'

interface PatternSelectorProps {
    value: string | number;
    onChange: (value: string) => void;
    className?: string;
}

export default function PatternSelector({ value, onChange, className }: PatternSelectorProps) {
    const supabase = createClient()
    const [patterns, setPatterns] = useState<any[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    const [newPattern, setNewPattern] = useState({
        clave: '', descripcion: '', marca: '', trazabilidad: '', 
        fecha_calibracion: '', fecha_vencimiento: ''
    })

    useEffect(() => {
        loadPatterns()
    }, [])

    async function loadPatterns() {
        const { data } = await supabase.from('patterns').select('*').eq('estatus', 'Activo').order('clave', { ascending: true })
        setPatterns(data || [])
    }

    const handleCreate = async () => {
        if (!newPattern.clave || !newPattern.descripcion) return alert("Llena los datos básicos")
        
        const { data, error } = await supabase.from('patterns').insert({
            ...newPattern,
            estatus: 'Activo'
        }).select().single()

        if (error) {
            alert(error.message)
        } else {
            setIsModalOpen(false)
            setNewPattern({ clave: '', descripcion: '', marca: '', trazabilidad: '', fecha_calibracion: '', fecha_vencimiento: '' })
            await loadPatterns()
            if (data) {
                onChange(data.id.toString())
            }
        }
    }

    return (
        <div className="flex gap-2 w-full">
            <select 
                className={className || "w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold"} 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">-- Seleccionar --</option>
                {patterns.map(p => <option key={p.id} value={p.id}>{p.clave} - {p.marca}</option>)}
            </select>
            
            <button 
                type="button"
                onClick={() => setIsModalOpen(true)} 
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 rounded border border-purple-200 transition flex items-center justify-center shrink-0"
                title="Agregar Nuevo Patrón"
            >
                <Plus size={16}/>
            </button>

            {/* MODAL CREAR */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 text-left">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-black text-xl uppercase text-slate-800 flex items-center gap-2">
                                <Plus size={20} className="text-purple-600"/> Registrar Patrón
                            </h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24}/>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Clave Interna (ID)</label>
                                <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-normal" placeholder="Ej. P-TEMP-01" value={newPattern.clave} onChange={e => setNewPattern({...newPattern, clave: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descripción del Equipo</label>
                                <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-normal" placeholder="Ej. Termómetro Digital de Referencia" value={newPattern.descripcion} onChange={e => setNewPattern({...newPattern, descripcion: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Marca</label>
                                    <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-normal" placeholder="Ej. Fluke" value={newPattern.marca} onChange={e => setNewPattern({...newPattern, marca: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Certificado / Trazabilidad</label>
                                    <input className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-normal" placeholder="Ej. CNM-2023-05" value={newPattern.trazabilidad} onChange={e => setNewPattern({...newPattern, trazabilidad: e.target.value})} />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Última Calibración</label>
                                    <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white outline-none font-normal" value={newPattern.fecha_calibracion} onChange={e => setNewPattern({...newPattern, fecha_calibracion: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Próximo Vencimiento</label>
                                    <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white outline-none font-normal" value={newPattern.fecha_vencimiento} onChange={e => setNewPattern({...newPattern, fecha_vencimiento: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-8 border-t border-slate-100 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                            <button type="button" onClick={handleCreate} className="px-8 py-2.5 text-xs font-bold uppercase bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 transition">Guardar Equipo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
