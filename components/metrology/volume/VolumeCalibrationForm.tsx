'use strict'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Plus, Trash2, Loader2, FileText, Beaker } from 'lucide-react'

function calculateMean(arr: number[]) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
}

function calculateStdDev(arr: number[]) {
    if (!arr || arr.length < 2) return 0;
    const mean = calculateMean(arr);
    const sumSquares = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    return Math.sqrt(sumSquares / (arr.length - 1));
}

interface VolumePoint {
    nominal: string; 
    toma1: string; toma2: string; toma3: string; toma4: string; toma5: string;
    tol_patron: number; // Editable por fila
    promedio: number; error: number;
    uA: number; uB_patron: number; uB_resol: number; uC: number;
    U_expandida: number; error_abs: number;
}

interface VolumeParameter {
    id: string;
    nombre: string;
    puntos: VolumePoint[];
}

export default function VolumeCalibrationForm({ itemId, orderId }: { itemId: number, orderId?: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [patterns, setPatterns] = useState<any[]>([])
    
    // Entorno
    const [env, setEnv] = useState({
        temp_inicial: 22.0, temp_final: 22.0,
        humedad_inicial: 45, humedad_final: 45,
        patron_id: ''
    })

    // Configuración global del equipo
    const [config, setConfig] = useState({
        intervalo_min: 0,
        intervalo_max: 1000,
        resolucion: 10,
        res_d_ind: 0.1, // Resolución del dispositivo indicador
        unidad: 'mL',
        especificacion: '',
        distribucion: 'rectangular'
    })

    const createEmptyPoint = (): VolumePoint => ({
        nominal: '', toma1: '', toma2: '', toma3: '', toma4: '', toma5: '',
        tol_patron: 0.15,
        promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0
    })

    const [parameters, setParameters] = useState<VolumeParameter[]>([
        {
            id: 'param-1',
            nombre: 'VOLUMEN',
            puntos: [
                { ...createEmptyPoint(), nominal: '200' },
                { ...createEmptyPoint(), nominal: '400' },
                { ...createEmptyPoint(), nominal: '600' },
                { ...createEmptyPoint(), nominal: '800' },
                { ...createEmptyPoint(), nominal: '1000' }
            ]
        }
    ])
    
    // Anexo II
    const [anexo, setAnexo] = useState("")

    useEffect(() => {
        async function loadPatterns() {
            const { data } = await supabase.from('patterns').select('*').eq('estatus', 'Activo')
            setPatterns(data || [])
        }
        loadPatterns()
    }, [])

    const updateConfig = (field: string, value: any) => {
        const newConfig = { ...config, [field]: value }
        setConfig(newConfig)
        setParameters(prev => prev.map(p => ({
            ...p,
            puntos: p.puntos.map(pt => recalculatePoint(pt, newConfig))
        })))
    }

    const addParameter = () => {
        const newId = `param-${Date.now()}`
        setParameters(prev => [...prev, {
            id: newId,
            nombre: `PARÁMETRO ${prev.length + 1}`,
            puntos: [
                createEmptyPoint(), createEmptyPoint(), createEmptyPoint(), createEmptyPoint(), createEmptyPoint()
            ]
        }])
    }

    const removeParameter = (id: string) => {
        if (parameters.length > 1) {
            setParameters(prev => prev.filter(p => p.id !== id))
        }
    }

    const updateParameterField = (pIdx: number, field: string, value: string) => {
        setParameters(prev => {
            const arr = [...prev]
            arr[pIdx] = { ...arr[pIdx], [field]: value }
            return arr
        })
    }

    const handlePointChange = (pIdx: number, ptIndex: number, field: keyof VolumePoint, value: any) => {
        setParameters(prev => {
            const arr = [...prev]
            const newPoint = { ...arr[pIdx].puntos[ptIndex], [field]: value }
            arr[pIdx].puntos[ptIndex] = recalculatePoint(newPoint, config)
            return arr
        })
    }

    const recalculatePoint = (pt: VolumePoint, cfg: typeof config): VolumePoint => {
        const nominal = parseFloat(pt.nominal) || 0;
        const tomas = [parseFloat(pt.toma1), parseFloat(pt.toma2), parseFloat(pt.toma3), parseFloat(pt.toma4), parseFloat(pt.toma5)];

        if (tomas.filter(t => !isNaN(t)).length === 5) {
            const promedio = calculateMean(tomas)
            const error = promedio - nominal
            const stdDev = calculateStdDev(tomas)
            
            // Fórmulas estándar
            const uA = stdDev * 1.4; 
            const uB_patron = pt.tol_patron / 2; // Dinámico por fila
            
            // IMPORTANTE: Utiliza la Resolución principal (cfg.resolucion), 
            // no la Res. D. Ind., tal cual lo hace el archivo V-MK-3319.
            const uB_resol = cfg.resolucion / Math.sqrt(12); 
            
            const uC = Math.sqrt(Math.pow(uA, 2) + Math.pow(uB_patron, 2) + Math.pow(uB_resol, 2))
            const U_expandida = 2 * uC // Factor k=2
            
            return {
                ...pt, promedio, error, error_abs: Math.abs(error),
                uA, uB_patron, uB_resol, uC, U_expandida
            }
        }
        return { ...pt, promedio: 0, error: 0, error_abs: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0 }
    }

    const handleSave = async () => {
        if (!env.patron_id) return alert("Selecciona el patrón utilizado")
        
        setLoading(true)
        try {
            const { error: resError } = await supabase.from('calibration_results').insert({
                item_id: itemId,
                temp_inicial: env.temp_inicial,
                temp_final: env.temp_final,
                humedad_inicial: env.humedad_inicial,
                humedad_final: env.humedad_final,
                patron_id: Number(env.patron_id),
                observaciones: anexo,
                datos_calibracion: {
                    tipo: 'VOLUMEN',
                    configuracion: config,
                    parametros: parameters
                },
                fecha_calibracion: new Date().toISOString()
            })

            if (resError) throw resError

            await supabase.from('service_order_items').update({ 
                estatus_tecnico: 'Terminado', 
                fecha_finalizacion: new Date().toISOString(),
                magnitud: 'Volumen'
            }).eq('id', itemId)

            alert("✅ Calibración de Volumen guardada con éxito.")
            window.location.reload()

        } catch (e: any) {
            alert("Error: " + e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-[10px]">
            {/* HEADER */}
            <div className="bg-cyan-50 p-4 border-b border-cyan-100 flex justify-between items-center">
                <h3 className="font-bold text-cyan-800 uppercase flex items-center gap-2 text-sm">
                    <Beaker size={18} className="text-cyan-600"/> HOJA DE CÁLCULO VOLUMEN
                </h3>
            </div>

            <div className="p-4 space-y-8">
                {/* AMBIENTE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Balanza / Patrón Utilizado</label>
                         <select className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold" value={env.patron_id} onChange={(e) => setEnv({...env, patron_id: e.target.value})}>
                            <option value="">-- Seleccionar --</option>
                            {patterns.map(p => <option key={p.id} value={p.id}>{p.clave} - {p.marca}</option>)}
                         </select>
                    </div>
                    <div><span className="font-bold block text-[10px] uppercase text-slate-400">Temp Inicial / Final (°C)</span>
                        <div className="flex gap-2 mt-1">
                            <input type="number" value={env.temp_inicial} onChange={e=>setEnv({...env, temp_inicial: +e.target.value})} className="border rounded p-1 w-full text-center"/>
                            <input type="number" value={env.temp_final} onChange={e=>setEnv({...env, temp_final: +e.target.value})} className="border rounded p-1 w-full text-center"/>
                        </div>
                    </div>
                    <div><span className="font-bold block text-[10px] uppercase text-slate-400">Humedad Inicial / Final (%)</span>
                        <div className="flex gap-2 mt-1">
                            <input type="number" value={env.humedad_inicial} onChange={e=>setEnv({...env, humedad_inicial: +e.target.value})} className="border rounded p-1 w-full text-center"/>
                            <input type="number" value={env.humedad_final} onChange={e=>setEnv({...env, humedad_final: +e.target.value})} className="border rounded p-1 w-full text-center"/>
                        </div>
                    </div>
                </div>

                {/* PARÁMETROS DINÁMICOS */}
                <div className="space-y-12">
                    {parameters.map((param, pIdx) => (
                        <div key={param.id} className="border-2 border-black">
                            {/* TÍTULO MAGNITUD */}
                            <div className="bg-cyan-100 text-cyan-900 p-2 text-center border-b-2 border-black flex items-center">
                                <button onClick={() => removeParameter(param.id)} className="text-red-400 hover:text-red-600 mr-2"><Trash2 size={16}/></button>
                                <input type="text" className="w-full text-center font-bold text-lg uppercase bg-transparent outline-none" 
                                    value={param.nombre} onChange={(e) => updateParameterField(pIdx, 'nombre', e.target.value)} placeholder="VOLUMEN" />
                            </div>
                            
                            {/* BLOQUE DE CONFIGURACIÓN */}
                            <div className="bg-white p-0">
                                <div className="flex text-[11px] font-bold">
                                    {/* PANEL IZQUIERDO */}
                                    <div className="flex-1 max-w-sm border-r border-black">
                                        <div className="flex border-b border-black">
                                            <div className="w-1/3 border-r border-black p-1 bg-white">INTERVALO</div>
                                            <div className="w-1/3 border-r border-black bg-yellow-200">
                                                <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={config.intervalo_min} onChange={(e) => updateConfig('intervalo_min', parseFloat(e.target.value))} />
                                            </div>
                                            <div className="w-1/6 border-r border-black p-1 text-center bg-white">A</div>
                                            <div className="w-1/3 bg-yellow-200">
                                                <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={config.intervalo_max} onChange={(e) => updateConfig('intervalo_max', parseFloat(e.target.value))} />
                                            </div>
                                        </div>
                                        <div className="flex border-b border-black">
                                            <div className="w-1/3 border-r border-black p-1 bg-white">RESOLUCION</div>
                                            <div className="w-2/3 bg-yellow-200 border-r border-black">
                                                <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={config.resolucion} onChange={(e) => updateConfig('resolucion', parseFloat(e.target.value))} step="0.1"/>
                                            </div>
                                        </div>
                                        {/* NUEVO CAMPO Res. D. Ind. */}
                                        <div className="flex border-b border-black">
                                            <div className="w-1/3 border-r border-black p-1 bg-white">Res. D. Ind.</div>
                                            <div className="w-2/3 bg-yellow-200 border-r border-black">
                                                <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={config.res_d_ind} onChange={(e) => updateConfig('res_d_ind', parseFloat(e.target.value))} step="0.1"/>
                                            </div>
                                        </div>
                                        <div className="flex border-b border-black">
                                            <div className="w-1/3 border-r border-black p-1 bg-white">UNIDAD</div>
                                            <div className="w-2/3 bg-yellow-200 border-r border-black text-center pt-1">
                                                <input type="text" className="w-full h-full text-center bg-transparent outline-none font-bold" value={config.unidad} onChange={(e) => updateConfig('unidad', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 p-2 flex flex-col justify-center border-r border-black bg-white"></div>
                                </div>

                                {/* TABLA PRINCIPAL DE CÁLCULOS */}
                                <div className="w-full overflow-x-auto border-t-2 border-black flex pb-4">
                                    <table className="text-center text-[10px] whitespace-nowrap border-collapse">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="border-r border-black p-1 align-bottom font-bold">Valor medido<br/>del Patrón<br/>{config.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom font-bold">Muestra 1<br/>{config.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom font-bold">Muestra 2<br/>{config.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom font-bold">Muestra 3<br/>{config.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom font-bold">Muestra 4<br/>{config.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom font-bold">Muestra 5<br/>{config.unidad}</th>
                                                
                                                {/* uA con encabezado completo */}
                                                <th className="border-r border-black p-1 align-bottom text-slate-500 font-normal">
                                                    para 5<br/>muestras<br/><br/>t= 1.4<br/><br/><span className="font-bold text-slate-800">uA</span><br/>{config.unidad}
                                                </th>
                                                
                                                {/* TOL PATRON con Especificacion */}
                                                <th className="border-r border-black p-1 align-bottom bg-yellow-50 text-blue-800 font-normal">
                                                    Especificación<br/><input type="text" className="w-16 text-center outline-none border-b border-slate-300 mt-1 mb-2 bg-transparent text-slate-800" value={config.especificacion} onChange={(e) => updateConfig('especificacion', e.target.value)} placeholder="balanza"/><br/><span className="font-bold">Tol. de Patrón</span><br/>{config.unidad}
                                                </th>
                                                
                                                {/* uB Patron con Distribucion */}
                                                <th className="border-r border-black p-1 align-bottom text-slate-500 font-normal">
                                                    distribución<br/><br/><span className="text-blue-500">{config.distribucion}</span><br/><br/><span className="font-bold text-slate-800">uB de Patrón</span><br/>{config.unidad}
                                                </th>
                                                
                                                <th className="border-r border-black p-1 align-bottom text-slate-500 font-bold"><br/><br/><br/><br/><br/>uB resol.<br/>{config.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500 font-bold"><br/><br/><br/><br/><br/>uC<br/>{config.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500 font-bold"><br/><br/><br/><br/><br/>Grados<br/>de libertad</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500 font-bold"><br/><br/><br/><br/><br/>Factor k</th>
                                                <th className="border-r border-black p-1 align-bottom font-bold"><br/><br/><br/><br/><br/>Uexpandida<br/>para 95.45%<br/>{config.unidad}</th>
                                                
                                                <th className="p-1 align-bottom font-bold"><br/><br/><br/><br/><br/>error</th>
                                                <th className="p-1 align-bottom font-bold"><br/><br/><br/><br/><br/>error +U</th>
                                                <th className="p-1 align-bottom font-bold"><br/><br/><br/><br/><br/>error -U</th>
                                                <th className="p-1 align-bottom font-bold"><br/><br/><br/><br/><br/>error_abs</th>
                                            </tr>
                                        </thead>
                                        <tbody className="border-t-2 border-black">
                                            {param.puntos.map((row, i) => (
                                                <tr key={i} className="bg-white border-b border-slate-300">
                                                    
                                                    {/* NOMINAL (En Volumen el titulo dice Valor medido del Patrón) */}
                                                    <td className="border-r border-black p-0">
                                                        <input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none font-bold text-slate-800" value={row.nominal} onChange={e => handlePointChange(pIdx, i, 'nominal', e.target.value)} />
                                                    </td>
                                                    <td className="border-r border-black p-0 bg-yellow-200"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma1} onChange={e => handlePointChange(pIdx, i, 'toma1', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma2} onChange={e => handlePointChange(pIdx, i, 'toma2', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma3} onChange={e => handlePointChange(pIdx, i, 'toma3', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma4} onChange={e => handlePointChange(pIdx, i, 'toma4', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma5} onChange={e => handlePointChange(pIdx, i, 'toma5', e.target.value)} /></td>
                                                    
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uA.toFixed(4)}</td>
                                                    
                                                    {/* TOL DE PATRÓN DINÁMICA */}
                                                    <td className="border-r border-black p-0 bg-yellow-100">
                                                        <input type="number" className="w-16 text-center bg-transparent outline-none font-bold text-blue-700" value={row.tol_patron} onChange={e => handlePointChange(pIdx, i, 'tol_patron', parseFloat(e.target.value))} step="0.0001"/>
                                                    </td>
                                                    
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uB_patron.toFixed(4)}</td>
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uB_resol.toFixed(4)}</td>
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uC.toFixed(5)}</td>
                                                    <td className="border-r border-black p-1 text-slate-600">∞</td>
                                                    <td className="border-r border-black p-1 text-slate-600">2</td>
                                                    
                                                    <td className="border-r border-black p-1 font-bold text-purple-700">{row.U_expandida.toFixed(5)}</td>

                                                    <td className="p-1 font-bold text-slate-800">{row.error.toFixed(3)}</td>
                                                    <td className="p-1">{(row.error + row.U_expandida).toFixed(3)}</td>
                                                    <td className="p-1">{(row.error - row.U_expandida).toFixed(3)}</td>
                                                    <td className="p-1 font-bold">{row.error_abs.toFixed(3)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* BOTÓN AGREGAR */}
                <div className="flex justify-center mt-6">
                    <button onClick={addParameter} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-700 flex items-center gap-2 shadow transition-all">
                        <Plus size={16}/> Agregar Nuevo Parámetro
                    </button>
                </div>

                <hr className="border-slate-200"/>

                {/* ANEXO II */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="font-bold uppercase flex items-center gap-2 text-slate-700 mb-2"><FileText size={16}/> Anexo II: Descripción de Pruebas</h4>
                    <p className="text-[10px] text-slate-500 mb-2">Este texto se imprimirá en una hoja adicional al final del certificado PDF.</p>
                    <textarea 
                        className="w-full h-32 border border-slate-300 rounded-lg p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej: Determinación de volumen..."
                        value={anexo}
                        onChange={(e) => setAnexo(e.target.value)}
                    ></textarea>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg shadow-indigo-200 transition disabled:opacity-50 text-sm">
                        {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Calibración
                    </button>
                </div>
            </div>
        </div>
    )
}
