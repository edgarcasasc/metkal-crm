'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Calculator, Loader2 } from 'lucide-react'

// Conversiones a kPa según el Excel
const unitFactors: Record<string, number> = {
    'PSI': 6.8948,
    'BAR': 100,
    'mBAR': 0.1,
    'Pa': 0.001,
    'kPa': 1,
    'MPa': 1000,
    'Kgs/cm2': 98.067,
    'mm H2O': 98.0665,
    'In. H2O': 0.248641,
    'mm Hg': 0.1333,
    'cm.Hg': 1.3332,
    'In.Hg': 3.3864,
    'Kp/cm2 (at)': 101.33
}

export default function PressureCalibrationForm({ itemId, orderId, magnitud }: { itemId: number, orderId?: string, magnitud: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    
    // Unidades Dinámicas
    const [unidadesOptions, setUnidadesOptions] = useState<{id: number, nombre: string, factor_conversion: number}[]>([])

    useEffect(() => {
        const fetchUnidades = async () => {
            const { data, error } = await supabase
                .from('magnitud_unidades')
                .select('id, nombre, factor_conversion, magnitudes!inner(nombre)')
                .ilike('magnitudes.nombre', magnitud)
            
            if (data) {
                setUnidadesOptions(data)
                // Si la unidad actual no está en la lista estática ni dinámica, setear la primera disponible
                if (!data.find(u => u.nombre === specs.unidad) && !unitFactors[specs.unidad]) {
                    setSpecs(prev => ({...prev, unidad: data.length > 0 ? data[0].nombre : 'PSI'}))
                }
            }
        }
        fetchUnidades()
    }, [magnitud])
    
    // Entorno (Toma_datos)
    const [env, setEnv] = useState({
        temp_inicial: 22.0, temp_final: 22.0,
        humedad_inicial: 45, humedad_final: 45,
        presion_inicial: 1013, presion_final: 1013
    })

    // Configuración Instrumento
    const [specs, setSpecs] = useState({
        alcance: 100,
        resolucion: 2,
        unidad: 'PSI',
        fluido: 'Aire'
    })

    // Factores de Incertidumbre Global (para Cálculos)
    const [uFactors, setUFactors] = useState({
        u_patron: 0.0037,
        u_ceropatron: 0,
        u_ryr: 0.00062,
        u_deriva: 0.50554,
        u_paralaje: 0.28868,
        u_dh: 0.00006
    })

    // Puntos de Calibración
    const [points, setPoints] = useState<any[]>([])

    // Generar tabla de 6 puntos por defecto
    useEffect(() => {
        const defaultPoints = [0, 10, 30, 50, 70, 90].map(nom => ({
            nominal: nom,
            patron_asc: '', ibc_asc: '',
            patron_desc: '', ibc_desc: '',
            // Calculados:
            promedio_patron: 0,
            promedio_ibc: 0,
            error_medida: 0,
            u_c: 0,
            U_expandida: 0
        }))
        setPoints(defaultPoints)
    }, [])

    const handlePointChange = (index: number, field: string, value: string) => {
        const newPoints = [...points]
        newPoints[index][field] = value
        setPoints(newPoints)
        // No calculamos en vivo para no trabar el input, 
        // usaremos un botón "Calcular" o lo haremos al guardar.
    }

    const calculateAll = () => {
        // Buscar factor de conversión primero en dinámicos, luego en estáticos, por defecto 1
        const dynamicUnit = unidadesOptions.find(u => u.nombre === specs.unidad)
        const factor = dynamicUnit ? Number(dynamicUnit.factor_conversion) : (unitFactors[specs.unidad] || 1)
        
        const u_resIBC = (specs.resolucion / Math.sqrt(12)) * factor // aprox u(res) = res / 2*sqrt(3) = res / sqrt(12)

        const calculated = points.map(p => {
            const pa = parseFloat(p.patron_asc) || 0
            const ia = parseFloat(p.ibc_asc) || 0
            const pd = parseFloat(p.patron_desc) || 0
            const id = parseFloat(p.ibc_desc) || 0

            const prom_patron = (pa + pd) / 2
            const prom_ibc = (ia + id) / 2
            const error = prom_ibc - prom_patron

            // Incertidumbre Combinada (uc) - Basado en los factores (suponiendo suma de varianzas cuadradas)
            const varianza = 
                Math.pow(u_resIBC, 2) +
                Math.pow(uFactors.u_patron, 2) +
                Math.pow(uFactors.u_ceropatron, 2) +
                Math.pow(uFactors.u_ryr, 2) +
                Math.pow(uFactors.u_deriva, 2) +
                Math.pow(uFactors.u_paralaje, 2) +
                Math.pow(uFactors.u_dh, 2)

            const uc = Math.sqrt(varianza)
            const U = uc * 2 // k=2 aprox 95%

            return {
                ...p,
                promedio_patron: prom_patron,
                promedio_ibc: prom_ibc,
                error_medida: error,
                u_c: uc,
                U_expandida: U
            }
        })

        setPoints(calculated)
    }

    const handleSave = async () => {
        setLoading(true)
        calculateAll() // Asegurar que todo esté calculado
        
        try {
            const { error: resError } = await supabase.from('calibration_results').insert({
                item_id: itemId,
                temp_inicial: env.temp_inicial,
                temp_final: env.temp_final,
                humedad_inicial: env.humedad_inicial,
                humedad_final: env.humedad_final,
                presion_atmosferica: env.presion_inicial, // Guardamos la inicial como referencia global
                datos_calibracion: {
                    entorno: env,
                    instrumento: specs,
                    factores_incertidumbre: uFactors,
                    puntos: points
                },
                fecha_calibracion: new Date().toISOString()
            })

            if (resError) throw resError

            const { error: itemError } = await supabase
                .from('service_order_items')
                .update({ 
                    estatus_tecnico: 'Terminado', 
                    fecha_finalizacion: new Date().toISOString()
                })
                .eq('id', itemId)
            
            if (itemError) throw itemError

            alert("✅ Datos de Presión guardados correctamente")
            window.location.reload()
            
        } catch (error: any) {
            alert("Error al guardar: " + error.message)
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6 animate-in fade-in duration-500">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        📋 Hoja de Trabajo P-MK-0795
                    </h2>
                    <p className="text-xs text-slate-400">Calibración de Presión Avanzada</p>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Magnitud</span>
                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{magnitud}</span>
                </div>
            </div>

            <div className="p-6 space-y-8">
                
                {/* 1. CONFIGURACIÓN E INSTRUMENTO */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Alcance Instrumento</label>
                        <input type="number" className="w-full border rounded p-1.5 text-sm" value={specs.alcance} onChange={e => setSpecs({...specs, alcance: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Resolución</label>
                        <input type="number" className="w-full border rounded p-1.5 text-sm" value={specs.resolucion} onChange={e => setSpecs({...specs, resolucion: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Unidad</label>
                        <select className="w-full border rounded p-1.5 text-sm" value={specs.unidad} onChange={e => setSpecs({...specs, unidad: e.target.value})}>
                            <optgroup label="Establecidas">
                                {Object.keys(unitFactors).map(u => <option key={`static-${u}`} value={u}>{u}</option>)}
                            </optgroup>
                            {unidadesOptions.length > 0 && (
                                <optgroup label="Agregadas">
                                    {unidadesOptions.map(u => <option key={`dyn-${u.id}`} value={u.nombre}>{u.nombre}</option>)}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Fluido</label>
                        <input type="text" className="w-full border rounded p-1.5 text-sm" value={specs.fluido} onChange={e => setSpecs({...specs, fluido: e.target.value})} />
                    </div>
                </div>

                {/* 2. CONDICIONES AMBIENTALES */}
                <div>
                    <h3 className="font-bold text-sm text-slate-700 border-b pb-2 mb-4">Condiciones Ambientales</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex gap-2">
                            <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase">T. Ini (°C)</label><input type="number" className="w-full border rounded p-1 text-xs" value={env.temp_inicial} onChange={(e) => setEnv({...env, temp_inicial: parseFloat(e.target.value)})}/></div>
                            <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase">T. Fin (°C)</label><input type="number" className="w-full border rounded p-1 text-xs" value={env.temp_final} onChange={(e) => setEnv({...env, temp_final: parseFloat(e.target.value)})}/></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase">HR. Ini (%)</label><input type="number" className="w-full border rounded p-1 text-xs" value={env.humedad_inicial} onChange={(e) => setEnv({...env, humedad_inicial: parseFloat(e.target.value)})}/></div>
                            <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase">HR. Fin (%)</label><input type="number" className="w-full border rounded p-1 text-xs" value={env.humedad_final} onChange={(e) => setEnv({...env, humedad_final: parseFloat(e.target.value)})}/></div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase">P. Ini (hPa)</label><input type="number" className="w-full border rounded p-1 text-xs" value={env.presion_inicial} onChange={(e) => setEnv({...env, presion_inicial: parseFloat(e.target.value)})}/></div>
                            <div className="flex-1"><label className="block text-[9px] font-bold text-slate-400 uppercase">P. Fin (hPa)</label><input type="number" className="w-full border rounded p-1 text-xs" value={env.presion_final} onChange={(e) => setEnv({...env, presion_final: parseFloat(e.target.value)})}/></div>
                        </div>
                    </div>
                </div>

                {/* 3. TOMA DE DATOS (CICLO) */}
                <div>
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="font-bold text-sm text-slate-700">Toma de Datos (Ascendente y Descendente)</h3>
                        <button onClick={calculateAll} className="bg-sky-100 text-sky-600 hover:bg-sky-200 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition">
                            <Calculator size={14}/> Calcular Promedios e Incertidumbre
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                                <tr>
                                    <th className="p-2 border" rowSpan={2}>Nominal</th>
                                    <th className="p-2 border" colSpan={2}>Ascendente (Lectura 1)</th>
                                    <th className="p-2 border" colSpan={2}>Descendente (Lectura 2)</th>
                                    <th className="p-2 border bg-sky-50 text-sky-700" colSpan={3}>Resultados Calculados</th>
                                </tr>
                                <tr>
                                    <th className="p-2 border font-medium">Patrón</th>
                                    <th className="p-2 border font-medium">IBC (Instr)</th>
                                    <th className="p-2 border font-medium">Patrón</th>
                                    <th className="p-2 border font-medium">IBC (Instr)</th>
                                    <th className="p-2 border bg-sky-50 text-sky-700 font-medium">Error</th>
                                    <th className="p-2 border bg-sky-50 text-sky-700 font-medium">uc</th>
                                    <th className="p-2 border bg-sky-50 text-sky-700 font-medium">U Expandida</th>
                                </tr>
                            </thead>
                            <tbody>
                                {points.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                        <td className="p-1 border"><input type="number" className="w-16 p-1 text-center font-bold" value={p.nominal} onChange={e => handlePointChange(idx, 'nominal', e.target.value)} /></td>
                                        <td className="p-1 border"><input type="number" className="w-20 p-1 bg-white border" value={p.patron_asc} onChange={e => handlePointChange(idx, 'patron_asc', e.target.value)} /></td>
                                        <td className="p-1 border"><input type="number" className="w-20 p-1 bg-white border" value={p.ibc_asc} onChange={e => handlePointChange(idx, 'ibc_asc', e.target.value)} /></td>
                                        <td className="p-1 border"><input type="number" className="w-20 p-1 bg-white border" value={p.patron_desc} onChange={e => handlePointChange(idx, 'patron_desc', e.target.value)} /></td>
                                        <td className="p-1 border"><input type="number" className="w-20 p-1 bg-white border" value={p.ibc_desc} onChange={e => handlePointChange(idx, 'ibc_desc', e.target.value)} /></td>
                                        <td className="p-2 border bg-sky-50 text-center font-mono text-sky-800">{p.error_medida.toFixed(4)}</td>
                                        <td className="p-2 border bg-sky-50 text-center font-mono text-sky-800">{p.u_c.toFixed(4)}</td>
                                        <td className="p-2 border bg-sky-50 text-center font-mono text-sky-800 font-bold">{p.U_expandida.toFixed(4)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* BOTÓN DE GUARDADO */}
                <div className="pt-4 border-t flex justify-end">
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                        {loading ? 'Guardando...' : 'Finalizar y Guardar Resultados'}
                    </button>
                </div>

            </div>
        </div>
    )
}