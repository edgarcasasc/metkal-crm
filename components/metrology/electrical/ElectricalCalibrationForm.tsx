'use strict'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Zap, Plus, Trash2, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react'

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

interface Point {
    nominal: string;
    toma1: string; toma2: string; toma3: string; toma4: string; toma5: string;
    promedio: number; error: number;
    uA: number; uB_patron: number; uB_resol: number; uC: number;
    U_expandida: number; error_abs: number;
}

interface Parameter {
    id: string;
    nombre: string;
    intervalo_min: number;
    intervalo_max: number;
    resolucion: number;
    unidad: string;
    especificacion: string;
    error_max: number;
    incertidumbre_max: number;
    tol_patron: number;
    puntos: Point[];
}

export default function ElectricalCalibrationForm({ itemId, orderId }: { itemId: number, orderId?: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [patterns, setPatterns] = useState<any[]>([])
    
    // Entorno
    const [env, setEnv] = useState({
        temp_inicial: 22.0, temp_final: 22.0,
        humedad_inicial: 45, humedad_final: 45,
        presion_atmosferica: 1013,
        patron_id: ''
    })

    // Lista de Magnitudes / Parámetros
    const [parameters, setParameters] = useState<Parameter[]>([])
    
    // Anexo II
    const [anexo, setAnexo] = useState("")

    useEffect(() => {
        async function loadPatterns() {
            const { data } = await supabase.from('patterns').select('*').eq('estatus', 'Activo')
            setPatterns(data || [])
        }
        loadPatterns()
        // Agregar un parámetro por defecto
        addParameter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const addParameter = () => {
        setParameters(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            nombre: 'TENSION ELECTRICA CONTINUA',
            intervalo_min: 0,
            intervalo_max: 600,
            resolucion: 0.1,
            unidad: 'mV',
            especificacion: 'MK-019\nFLUKE\n5502',
            error_max: 0.1,
            incertidumbre_max: 0.0578,
            tol_patron: 0.0016,
            puntos: Array(5).fill({ nominal: '', toma1: '', toma2: '', toma3: '', toma4: '', toma5: '', promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 })
        }])
    }

    const removeParameter = (paramId: string) => {
        setParameters(prev => prev.filter(p => p.id !== paramId))
    }

    const updateParameterField = (paramIndex: number, field: keyof Parameter, value: any) => {
        const newParams = [...parameters]
        newParams[paramIndex] = { ...newParams[paramIndex], [field]: value }
        
        // Si cambia resolución o tol_patron, recalcular puntos
        if (field === 'resolucion' || field === 'tol_patron') {
            newParams[paramIndex].puntos = newParams[paramIndex].puntos.map(pt => recalculatePoint(pt, newParams[paramIndex]))
        }
        
        setParameters(newParams)
    }

    const handlePointChange = (paramIndex: number, ptIndex: number, field: keyof Point, value: string) => {
        const newParams = [...parameters]
        const param = newParams[paramIndex]
        const newPoint = { ...param.puntos[ptIndex], [field]: value }
        
        param.puntos[ptIndex] = recalculatePoint(newPoint, param)
        setParameters(newParams)
    }

    const recalculatePoint = (pt: Point, param: Parameter): Point => {
        const nominal = parseFloat(pt.nominal) || 0;
        const tomas = [
            parseFloat(pt.toma1), parseFloat(pt.toma2), parseFloat(pt.toma3), 
            parseFloat(pt.toma4), parseFloat(pt.toma5)
        ].filter(t => !isNaN(t));

        if (tomas.length === 5) { // Requiere las 5 muestras para cálculos completos
            const promedio = calculateMean(tomas)
            const error = promedio - nominal
            const stdDev = calculateStdDev(tomas)
            
            const uA = stdDev / Math.sqrt(5)
            const uB_patron = param.tol_patron / Math.sqrt(3)
            const uB_resol = param.resolucion / (2 * Math.sqrt(3))
            
            const uC = Math.sqrt(Math.pow(uA, 2) + Math.pow(uB_patron, 2) + Math.pow(uB_resol, 2))
            const U_expandida = 2 * uC // Factor k=2
            
            return {
                ...pt, promedio, error, error_abs: Math.abs(error),
                uA, uB_patron, uB_resol, uC, U_expandida
            }
        }
        return { ...pt, promedio: 0, error: 0, error_abs: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0 }
    }

    const addPoint = (paramIndex: number) => {
        const newParams = [...parameters]
        newParams[paramIndex].puntos.push({ nominal: '', toma1: '', toma2: '', toma3: '', toma4: '', toma5: '', promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 })
        setParameters(newParams)
    }

    const removePoint = (paramIndex: number, ptIndex: number) => {
        const newParams = [...parameters]
        newParams[paramIndex].puntos.splice(ptIndex, 1)
        setParameters(newParams)
    }

    const handleSave = async () => {
        if (!env.patron_id) return alert("Selecciona el patrón utilizado")
        if (parameters.length === 0) return alert("Agrega al menos una magnitud")
        
        setLoading(true)
        try {
            const { error: resError } = await supabase.from('calibration_results').insert({
                item_id: itemId,
                temp_inicial: env.temp_inicial,
                temp_final: env.temp_final,
                humedad_inicial: env.humedad_inicial,
                humedad_final: env.humedad_final,
                presion_atmosferica: env.presion_atmosferica,
                patron_id: Number(env.patron_id),
                observaciones: anexo,
                datos_calibracion: {
                    tipo: 'ELÉCTRICA',
                    parametros: parameters
                },
                fecha_calibracion: new Date().toISOString()
            })

            if (resError) throw resError

            await supabase.from('service_order_items').update({ 
                estatus_tecnico: 'Terminado', 
                fecha_finalizacion: new Date().toISOString(),
                magnitud: 'Eléctrica'
            }).eq('id', itemId)

            alert("✅ Calibración Eléctrica guardada con éxito.")
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
            <div className="bg-amber-50 p-4 border-b border-amber-100 flex justify-between items-center">
                <h3 className="font-bold text-amber-800 uppercase flex items-center gap-2 text-sm">
                    <Zap size={18} className="text-amber-600"/> HOJA DE CÁLCULO ELÉCTRICA
                </h3>
            </div>

            <div className="p-4 space-y-8">
                {/* AMBIENTE */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Patrón Utilizado</label>
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
                    <div><span className="font-bold block text-[10px] uppercase text-slate-400">Presión Atmosférica</span>
                        <input type="number" value={env.presion_atmosferica} onChange={e=>setEnv({...env, presion_atmosferica: +e.target.value})} className="border rounded p-1 w-full text-center mt-1"/>
                    </div>
                </div>

                {/* DATALIST DE SUGERENCIAS */}
                <datalist id="magnitudes-electricas">
                    <option value="TENSION ELECTRICA CONTINUA" />
                    <option value="TENSION ELECTRICA ALTERNA (60 Hz)" />
                    <option value="CORRIENTE ELECTRICA CONTINUA" />
                    <option value="CORRIENTE ELECTRICA ALTERNA (60 Hz)" />
                    <option value="RESISTENCIA ELECTRICA" />
                </datalist>

                {/* PARÁMETROS DINÁMICOS */}
                <div className="space-y-12">
                    {parameters.map((param, pIdx) => (
                        <div key={param.id} className="border-2 border-black">
                            {/* TÍTULO MAGNITUD (ESTILO EXCEL) */}
                            <div className="bg-white text-black p-2 text-center border-b-2 border-black flex items-center">
                                <button onClick={() => removeParameter(param.id)} className="text-red-400 hover:text-red-600 mr-2"><Trash2 size={16}/></button>
                                <input type="text" list="magnitudes-electricas" className="w-full text-center font-bold text-lg uppercase outline-none" 
                                    value={param.nombre} onChange={(e) => updateParameterField(pIdx, 'nombre', e.target.value)} placeholder="TENSION ELECTRICA CONTINUA" />
                            </div>
                            
                            {/* BLOQUE DE CONFIGURACIÓN ESTILO EXCEL */}
                            <div className="bg-white p-0">
                                <div className="flex text-[11px] font-bold">
                                    {/* PANEL IZQUIERDO: INTERVALO, RESOLUCION, UNIDAD */}
                                    <div className="flex-1 max-w-sm border-r border-black">
                                        <div className="flex border-b border-black">
                                            <div className="w-1/3 border-r border-black p-1 bg-white">INTERVALO</div>
                                            <div className="w-1/3 border-r border-black bg-yellow-200">
                                                <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={param.intervalo_min} onChange={(e) => updateParameterField(pIdx, 'intervalo_min', parseFloat(e.target.value))} />
                                            </div>
                                            <div className="w-1/6 border-r border-black p-1 text-center bg-white">A</div>
                                            <div className="w-1/3 bg-yellow-200">
                                                <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={param.intervalo_max} onChange={(e) => updateParameterField(pIdx, 'intervalo_max', parseFloat(e.target.value))} />
                                            </div>
                                        </div>
                                        <div className="flex border-b border-black">
                                            <div className="w-1/3 border-r border-black p-1 bg-white">RESOLUCION</div>
                                            <div className="w-2/3 bg-yellow-200 border-r border-black">
                                                <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={param.resolucion} onChange={(e) => updateParameterField(pIdx, 'resolucion', parseFloat(e.target.value))} />
                                            </div>
                                        </div>
                                        <div className="flex border-b border-black">
                                            <div className="w-1/3 border-r border-black p-1 bg-white">UNIDAD</div>
                                            <div className="w-2/3 bg-yellow-200 border-r border-black">
                                                <input type="text" className="w-full h-full text-center bg-transparent outline-none" value={param.unidad} onChange={(e) => updateParameterField(pIdx, 'unidad', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* PANEL MEDIO: Error max e Incertidumbre */}
                                    <div className="flex-1 p-2 flex flex-col justify-center border-r border-black bg-white">
                                        <div className="flex items-center justify-between mb-1">
                                            <span>Error max:</span>
                                            <div className="flex items-center gap-1">
                                                <input type="number" className="w-16 text-right border-b border-slate-300 outline-none" value={param.error_max} onChange={(e) => updateParameterField(pIdx, 'error_max', parseFloat(e.target.value))} />
                                                <span className="w-6">{param.unidad}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Incertidumbre max:</span>
                                            <div className="flex items-center gap-1">
                                                <input type="number" className="w-16 text-right border-b border-slate-300 outline-none" value={param.incertidumbre_max} onChange={(e) => updateParameterField(pIdx, 'incertidumbre_max', parseFloat(e.target.value))} />
                                                <span className="w-6">{param.unidad}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* PANEL DERECHO: Especificación del Patrón */}
                                    <div className="w-48 text-center bg-white flex flex-col border-r border-black">
                                        <div className="p-1 border-b border-black">para 5<br/>muestras</div>
                                        <div className="p-1 border-b border-black">Especificación</div>
                                        <div className="p-1 flex-1">
                                            <textarea className="w-full h-full text-center outline-none resize-none text-[9px]" value={param.especificacion} onChange={(e) => updateParameterField(pIdx, 'especificacion', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* TABLA DE CÁLCULOS EXACTA COMO EXCEL */}
                                <div className="w-full overflow-x-auto border-t-2 border-black">
                                    <table className="w-full text-center text-[10px] whitespace-nowrap border-collapse">
                                        <thead className="font-bold bg-white">
                                            <tr>
                                                <th className="border-r border-black p-1 align-bottom">Valor Nominal<br/>del Patrón<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom">Muestra 1<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom">Muestra 2<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom">Muestra 3<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom">Muestra 4<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom">Muestra 5<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500">uA<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom bg-slate-100">Tol. de Patrón<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500">uB de Patrón<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500">uB resol.<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500">uC<br/>{param.unidad}</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500">Grados<br/>de libertad</th>
                                                <th className="border-r border-black p-1 align-bottom text-slate-500">Factor k</th>
                                                <th className="border-r border-black p-1 align-bottom font-bold">Uexpandida<br/>para 95.45%<br/>{param.unidad}</th>
                                                <th className="p-1 align-bottom">error</th>
                                                <th className="p-1 align-bottom">error +U</th>
                                                <th className="p-1 align-bottom">error -U</th>
                                                <th className="p-1 align-bottom">error_abs</th>
                                                <th className="w-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="border-t-2 border-black">
                                            {/* Fila para editar el Tol de Patrón que aplica a toda la columna */}
                                            <tr className="bg-slate-50 border-b border-black">
                                                <td colSpan={7} className="border-r border-black text-right p-1 font-bold text-slate-400">t= 1.4</td>
                                                <td className="border-r border-black p-0 bg-yellow-100">
                                                    <input type="number" className="w-16 text-center bg-transparent outline-none font-bold text-blue-700" value={param.tol_patron} onChange={(e) => updateParameterField(pIdx, 'tol_patron', parseFloat(e.target.value))} step="0.0001"/>
                                                </td>
                                                <td colSpan={11} className="p-1 text-left text-slate-400 text-[9px]">← Edita Tol. de Patrón aquí (aplica a todas las filas)</td>
                                            </tr>
                                            {param.puntos.map((row, i) => (
                                                <tr key={i} className="bg-white hover:bg-slate-50 border-b border-slate-300">
                                                    <td className="border-r border-black p-0">
                                                        <input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.nominal} onChange={e => handlePointChange(pIdx, i, 'nominal', e.target.value)} />
                                                    </td>
                                                    <td className="border-r border-black p-0 bg-yellow-200 font-bold"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma1} onChange={e => handlePointChange(pIdx, i, 'toma1', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200 font-bold"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma2} onChange={e => handlePointChange(pIdx, i, 'toma2', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200 font-bold"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma3} onChange={e => handlePointChange(pIdx, i, 'toma3', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200 font-bold"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma4} onChange={e => handlePointChange(pIdx, i, 'toma4', e.target.value)} /></td>
                                                    <td className="border-r border-black p-0 bg-yellow-200 font-bold"><input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none" value={row.toma5} onChange={e => handlePointChange(pIdx, i, 'toma5', e.target.value)} /></td>
                                                    
                                                    {/* CÁLCULOS INTERMEDIOS */}
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uA.toFixed(4)}</td>
                                                    <td className="border-r border-black p-1 text-slate-600 bg-slate-50">{param.tol_patron}</td>
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uB_patron.toFixed(4)}</td>
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uB_resol.toFixed(4)}</td>
                                                    <td className="border-r border-black p-1 text-slate-600">{row.uC.toFixed(5)}</td>
                                                    <td className="border-r border-black p-1 text-slate-600">∞</td>
                                                    <td className="border-r border-black p-1 text-slate-600">2</td>
                                                    
                                                    {/* U EXPANDIDA */}
                                                    <td className="border-r border-black p-1 font-bold">{row.U_expandida.toFixed(5)}</td>
                                                    
                                                    {/* ERRORES */}
                                                    <td className="p-1">{row.error.toFixed(3)}</td>
                                                    <td className="p-1">{(row.error + row.U_expandida).toFixed(3)}</td>
                                                    <td className="p-1">{(row.error - row.U_expandida).toFixed(3)}</td>
                                                    <td className="p-1">{row.error_abs.toFixed(3)}</td>
                                                    
                                                    <td className="p-1">
                                                        <button onClick={() => removePoint(pIdx, i)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="bg-slate-50 p-1 border-t border-black">
                                        <button onClick={() => addPoint(pIdx)} className="text-[10px] flex items-center gap-1 text-slate-600 font-bold uppercase hover:text-blue-600 transition mx-auto"><Plus size={12}/> Agregar Fila</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center mt-4">
                    <button onClick={addParameter} className="bg-slate-100 border-2 border-dashed border-slate-300 text-slate-600 px-6 py-3 rounded-xl font-bold uppercase text-xs flex items-center gap-2 hover:bg-slate-200 hover:border-slate-400 transition w-full justify-center">
                        <Plus size={16}/> Agregar Nueva Magnitud / Parámetro
                    </button>
                </div>

                <hr className="border-slate-200"/>

                {/* ANEXO II */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="font-bold uppercase flex items-center gap-2 text-slate-700 mb-2"><FileText size={16}/> Anexo II: Descripción de Pruebas</h4>
                    <p className="text-[10px] text-slate-500 mb-2">Este texto se imprimirá en una hoja adicional al final del certificado PDF.</p>
                    <textarea 
                        className="w-full h-32 border border-slate-300 rounded-lg p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Ej: Método de Comparación directa con patrones. Esta prueba evalúa el equipo de manera completa..."
                        value={anexo}
                        onChange={(e) => setAnexo(e.target.value)}
                    ></textarea>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg shadow-amber-200 transition disabled:opacity-50 text-sm">
                        {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Calibración
                    </button>
                </div>
            </div>
        </div>
    )
}
