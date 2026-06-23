'use strict'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Droplet, Plus, Trash2, Loader2, FileText } from 'lucide-react'

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

interface HardnessPoint {
    nominal: string;
    g1: string; g2: string; g3: string; g4: string; g5: string;
    toma1: number; toma2: number; toma3: number; toma4: number; toma5: number;
    promedio: number; error: number;
    uA: number; uB_patron: number; uB_resol: number; uC: number;
    U_expandida: number; error_abs: number;
}

export default function HardnessCalibrationForm({ itemId, orderId }: { itemId: number, orderId?: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [patterns, setPatterns] = useState<any[]>([])
    
    // Entorno
    const [env, setEnv] = useState({
        temp_inicial: 22.0, temp_final: 22.0,
        humedad_inicial: 45, humedad_final: 45,
        patron_id: ''
    })

    // Configuración del equipo
    const [config, setConfig] = useState({
        nombre: 'DUREZA',
        tipo_shore: 'A', // A o D
        intervalo_min: 10,
        intervalo_max: 90,
        resolucion: 0.5,
        unidad: 'HA',
        error_max: 1.222,
        incertidumbre_max: 0.4537,
        especificacion: 'MK-002',
        incertidumbre_patron: 0.3500, // En el excel le llaman Incertidumbre del patrón
        distribucion: 'rectangular'
    })

    const [puntos, setPuntos] = useState<HardnessPoint[]>([
        { nominal: '10', g1: '', g2: '', g3: '', g4: '', g5: '', toma1: 0, toma2: 0, toma3: 0, toma4: 0, toma5: 0, promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 },
        { nominal: '30', g1: '', g2: '', g3: '', g4: '', g5: '', toma1: 0, toma2: 0, toma3: 0, toma4: 0, toma5: 0, promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 },
        { nominal: '50', g1: '', g2: '', g3: '', g4: '', g5: '', toma1: 0, toma2: 0, toma3: 0, toma4: 0, toma5: 0, promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 },
        { nominal: '70', g1: '', g2: '', g3: '', g4: '', g5: '', toma1: 0, toma2: 0, toma3: 0, toma4: 0, toma5: 0, promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 },
        { nominal: '90', g1: '', g2: '', g3: '', g4: '', g5: '', toma1: 0, toma2: 0, toma3: 0, toma4: 0, toma5: 0, promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 },
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

    const calculateHardness = (g: number, tipo: string) => {
        if (isNaN(g)) return 0;
        if (tipo === 'A') {
            return (((9.8 * (g / 1000)) - 0.55) / 0.075);
        } else {
            // Shore D formula
            return (((9.8 * (g / 1000)) - 0.4445) / 0.4445);
        }
    }

    const updateConfig = (field: string, value: any) => {
        const newConfig = { ...config, [field]: value }
        if (field === 'tipo_shore') {
            newConfig.unidad = value === 'A' ? 'HA' : 'HD'
        }
        setConfig(newConfig)
        // Recalcular todos los puntos si cambian parámetros que afectan el cálculo
        setPuntos(prev => prev.map(pt => recalculatePoint(pt, newConfig)))
    }

    const handlePointChange = (ptIndex: number, field: keyof HardnessPoint, value: string) => {
        const newPoint = { ...puntos[ptIndex], [field]: value }
        setPuntos(prev => {
            const arr = [...prev]
            arr[ptIndex] = recalculatePoint(newPoint, config)
            return arr
        })
    }

    const recalculatePoint = (pt: HardnessPoint, cfg: typeof config): HardnessPoint => {
        const nominal = parseFloat(pt.nominal) || 0;
        
        // Calcular lecturas HA/HD a partir de los gramos
        const gVals = [parseFloat(pt.g1), parseFloat(pt.g2), parseFloat(pt.g3), parseFloat(pt.g4), parseFloat(pt.g5)];
        const tomas = gVals.map(g => calculateHardness(g, cfg.tipo_shore));

        if (gVals.filter(g => !isNaN(g)).length === 5) {
            const promedio = calculateMean(tomas)
            const error = promedio - nominal
            const stdDev = calculateStdDev(tomas)
            
            // t = 1.4 según Excel
            const uA = (stdDev * 1.4) / Math.sqrt(5) // Wait, in the Excel they multiplied standard deviation by 1.4, which is equivalent to dividing by some factor. Actually `STDEV(C19:G19)*1.4` was in Excel. Wait, the formula in Excel was `STDEV(C19:G19)*1.4` under uA? Wait, the typical uA is STDEV/sqrt(n). 1/sqrt(5) is 0.447. STDEV * 1.4 is different. Actually, the exact formula in the Excel was Col H: STDEV(C19:G19)*1.4. I will replicate EXACTLY the Excel formula: uA = STDEV * 1.4. Wait, maybe the t=1.4 means Student t? I'll just use what they had. Let's use `stdDev * 1.4` to match exactly. No wait, the header says uA but the column is just standard dev * factor? No, if we want exact match:
            const excel_uA = stdDev * 1.4; // Segun Excel
            
            // uB de Patrón = Incertidumbre / 2
            const uB_patron = cfg.incertidumbre_patron / 2
            
            // uB resol = Resolucion / sqrt(12)
            const uB_resol = cfg.resolucion / Math.sqrt(12)
            
            const uC = Math.sqrt(Math.pow(excel_uA, 2) + Math.pow(uB_patron, 2) + Math.pow(uB_resol, 2))
            const U_expandida = 2 * uC // Factor k=2 (Grados libertad inf)
            
            return {
                ...pt, 
                toma1: tomas[0], toma2: tomas[1], toma3: tomas[2], toma4: tomas[3], toma5: tomas[4],
                promedio, error, error_abs: Math.abs(error),
                uA: excel_uA, uB_patron, uB_resol, uC, U_expandida
            }
        }
        return { 
            ...pt, 
            toma1: tomas[0]||0, toma2: tomas[1]||0, toma3: tomas[2]||0, toma4: tomas[3]||0, toma5: tomas[4]||0, 
            promedio: 0, error: 0, error_abs: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0 
        }
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
                    tipo: 'DUREZA',
                    configuracion: config,
                    puntos: puntos
                },
                fecha_calibracion: new Date().toISOString()
            })

            if (resError) throw resError

            await supabase.from('service_order_items').update({ 
                estatus_tecnico: 'Terminado', 
                fecha_finalizacion: new Date().toISOString(),
                magnitud: 'Dureza'
            }).eq('id', itemId)

            alert("✅ Calibración de Dureza guardada con éxito.")
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
                    <Droplet size={18} className="text-amber-600"/> HOJA DE CÁLCULO DUREZA SHORE
                </h3>
            </div>

            <div className="p-4 space-y-8">
                {/* AMBIENTE */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
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
                    <div><span className="font-bold block text-[10px] uppercase text-slate-400">Escala Shore</span>
                        <select className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold text-center mt-1 text-blue-700" value={config.tipo_shore} onChange={(e) => updateConfig('tipo_shore', e.target.value)}>
                            <option value="A">Shore A (HA)</option>
                            <option value="D">Shore D (HD)</option>
                        </select>
                    </div>
                </div>

                <div className="border-2 border-black">
                    {/* TÍTULO */}
                    <div className="bg-white text-black p-2 text-center border-b-2 border-black flex items-center justify-center">
                        <span className="font-bold text-lg uppercase tracking-widest">{config.nombre} ({config.tipo_shore})</span>
                    </div>
                    
                    {/* BLOQUE DE CONFIGURACIÓN ESTILO EXCEL */}
                    <div className="bg-white p-0">
                        <div className="flex text-[11px] font-bold">
                            {/* PANEL IZQUIERDO: INTERVALO, RESOLUCION, UNIDAD */}
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
                                        <input type="number" className="w-full h-full text-center bg-transparent outline-none" value={config.resolucion} onChange={(e) => updateConfig('resolucion', parseFloat(e.target.value))} />
                                    </div>
                                </div>
                                <div className="flex border-b border-black">
                                    <div className="w-1/3 border-r border-black p-1 bg-white">UNIDAD</div>
                                    <div className="w-2/3 bg-yellow-200 border-r border-black text-center pt-1">
                                        {config.unidad}
                                    </div>
                                </div>
                            </div>

                            {/* PANEL MEDIO: Error max e Incertidumbre */}
                            <div className="flex-1 p-2 flex flex-col justify-center border-r border-black bg-white">
                                <div className="flex items-center justify-between mb-1">
                                    <span>Error max:</span>
                                    <div className="flex items-center gap-1">
                                        <input type="number" className="w-16 text-right border-b border-slate-300 outline-none" value={config.error_max} onChange={(e) => updateConfig('error_max', parseFloat(e.target.value))} />
                                        <span className="w-6">{config.unidad}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Incertidumbre max:</span>
                                    <div className="flex items-center gap-1">
                                        <input type="number" className="w-16 text-right border-b border-slate-300 outline-none" value={config.incertidumbre_max} onChange={(e) => updateConfig('incertidumbre_max', parseFloat(e.target.value))} />
                                        <span className="w-6">{config.unidad}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* PANEL DERECHO: Especificación del Patrón */}
                            <div className="w-64 text-center bg-white flex flex-col border-r border-black">
                                <div className="flex border-b border-black h-1/2">
                                    <div className="w-1/2 p-1 border-r border-black flex items-center justify-center">para 5<br/>muestras</div>
                                    <div className="w-1/2 p-1 flex items-center justify-center flex-col">
                                        Especificación
                                        <input type="text" className="w-full text-center outline-none border-b border-slate-300 mt-1" value={config.especificacion} onChange={(e) => updateConfig('especificacion', e.target.value)}/>
                                    </div>
                                </div>
                                <div className="flex h-1/2">
                                    <div className="w-1/2 p-1 border-r border-black flex items-center justify-center font-normal">t= 1.4</div>
                                    <div className="w-1/2 p-1 flex items-center justify-center flex-col">
                                        distribución
                                        <span className="text-blue-500 font-normal">{config.distribucion}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TABLA DE CÁLCULOS EXACTA COMO EXCEL */}
                        <div className="w-full overflow-x-auto border-t-2 border-black flex">
                            
                            {/* TABLA PRINCIPAL DE RESULTADOS (SOLO LECTURA) */}
                            <table className="text-center text-[10px] whitespace-nowrap border-collapse border-r-4 border-slate-800">
                                <thead className="font-bold bg-white">
                                    <tr>
                                        <th className="border-r border-black p-1 align-bottom">Valor Nominal<br/>del Patrón<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom">Muestra 1<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom">Muestra 2<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom">Muestra 3<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom">Muestra 4<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom">Muestra 5<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom text-slate-500">uA<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom bg-slate-100">Incertidumbre<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom text-slate-500">uB de Patrón<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom text-slate-500">uB resol.<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom text-slate-500">uC<br/>{config.unidad}</th>
                                        <th className="border-r border-black p-1 align-bottom text-slate-500">Grados<br/>de libertad</th>
                                        <th className="border-r border-black p-1 align-bottom text-slate-500">Factor k</th>
                                        <th className="border-r border-black p-1 align-bottom font-bold">Uexpandida<br/>para 95.45%<br/>{config.unidad}</th>
                                        <th className="p-1 align-bottom">error</th>
                                        <th className="p-1 align-bottom">error +U</th>
                                        <th className="p-1 align-bottom">error -U</th>
                                        <th className="p-1 align-bottom">error_abs</th>
                                    </tr>
                                </thead>
                                <tbody className="border-t-2 border-black">
                                    <tr className="bg-slate-50 border-b border-black">
                                        <td colSpan={7} className="border-r border-black text-right p-1 font-bold text-slate-400"></td>
                                        <td className="border-r border-black p-0 bg-yellow-100">
                                            <input type="number" className="w-16 text-center bg-transparent outline-none font-bold text-blue-700" value={config.incertidumbre_patron} onChange={(e) => updateConfig('incertidumbre_patron', parseFloat(e.target.value))} step="0.0001"/>
                                        </td>
                                        <td colSpan={10} className="p-1 text-left text-slate-400 text-[9px]">← Edita Incertidumbre Patrón</td>
                                    </tr>
                                    {puntos.map((row, i) => (
                                        <tr key={i} className="bg-white border-b border-slate-300">
                                            <td className="border-r border-black p-0">
                                                <input type="number" className="w-16 h-full p-1 text-center bg-transparent outline-none font-bold text-slate-800" value={row.nominal} onChange={e => handlePointChange(i, 'nominal', e.target.value)} />
                                            </td>
                                            {/* Celdas calculadas (Solo lectura) */}
                                            <td className="border-r border-black p-1 text-blue-800 font-bold bg-blue-50/30">{row.toma1 ? row.toma1.toFixed(4) : ''}</td>
                                            <td className="border-r border-black p-1 text-blue-800 font-bold bg-blue-50/30">{row.toma2 ? row.toma2.toFixed(4) : ''}</td>
                                            <td className="border-r border-black p-1 text-blue-800 font-bold bg-blue-50/30">{row.toma3 ? row.toma3.toFixed(4) : ''}</td>
                                            <td className="border-r border-black p-1 text-blue-800 font-bold bg-blue-50/30">{row.toma4 ? row.toma4.toFixed(4) : ''}</td>
                                            <td className="border-r border-black p-1 text-blue-800 font-bold bg-blue-50/30">{row.toma5 ? row.toma5.toFixed(4) : ''}</td>
                                            
                                            {/* CÁLCULOS INTERMEDIOS */}
                                            <td className="border-r border-black p-1 text-slate-600">{row.uA.toFixed(4)}</td>
                                            <td className="border-r border-black p-1 text-slate-600 bg-slate-50">{config.incertidumbre_patron}</td>
                                            <td className="border-r border-black p-1 text-slate-600">{row.uB_patron.toFixed(4)}</td>
                                            <td className="border-r border-black p-1 text-slate-600">{row.uB_resol.toFixed(4)}</td>
                                            <td className="border-r border-black p-1 text-slate-600">{row.uC.toFixed(5)}</td>
                                            <td className="border-r border-black p-1 text-slate-600">∞</td>
                                            <td className="border-r border-black p-1 text-slate-600">2</td>
                                            
                                            <td className="border-r border-black p-1 font-bold text-purple-700">{row.U_expandida.toFixed(5)}</td>
                                            
                                            <td className="p-1">{row.error.toFixed(3)}</td>
                                            <td className="p-1">{(row.error + row.U_expandida).toFixed(3)}</td>
                                            <td className="p-1">{(row.error - row.U_expandida).toFixed(3)}</td>
                                            <td className="p-1 font-bold">{row.error_abs.toFixed(3)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* TABLA DE CAPTURA DE FUERZA (GRAMOS) */}
                            <table className="text-center text-[10px] whitespace-nowrap border-collapse bg-slate-50">
                                <thead className="font-bold bg-slate-200">
                                    <tr>
                                        <th className="border-r border-slate-300 p-1 align-bottom text-slate-700" colSpan={5}>Masa Registrada en Balanza</th>
                                    </tr>
                                    <tr>
                                        <th className="border-r border-slate-300 p-1 w-16 text-slate-600">g</th>
                                        <th className="border-r border-slate-300 p-1 w-16 text-slate-600">g</th>
                                        <th className="border-r border-slate-300 p-1 w-16 text-slate-600">g</th>
                                        <th className="border-r border-slate-300 p-1 w-16 text-slate-600">g</th>
                                        <th className="p-1 w-16 text-slate-600">g</th>
                                    </tr>
                                </thead>
                                <tbody className="border-t-2 border-slate-800">
                                    <tr className="bg-slate-200 border-b border-slate-300 h-[21px]">
                                        <td colSpan={5}></td>
                                    </tr>
                                    {puntos.map((row, i) => (
                                        <tr key={`g-${i}`} className="bg-white border-b border-slate-300">
                                            <td className="border-r border-slate-300 p-0 bg-yellow-200"><input type="number" className="w-16 h-[22px] p-1 text-center bg-transparent outline-none font-bold" value={row.g1} onChange={e => handlePointChange(i, 'g1', e.target.value)} /></td>
                                            <td className="border-r border-slate-300 p-0 bg-yellow-200"><input type="number" className="w-16 h-[22px] p-1 text-center bg-transparent outline-none font-bold" value={row.g2} onChange={e => handlePointChange(i, 'g2', e.target.value)} /></td>
                                            <td className="border-r border-slate-300 p-0 bg-yellow-200"><input type="number" className="w-16 h-[22px] p-1 text-center bg-transparent outline-none font-bold" value={row.g3} onChange={e => handlePointChange(i, 'g3', e.target.value)} /></td>
                                            <td className="border-r border-slate-300 p-0 bg-yellow-200"><input type="number" className="w-16 h-[22px] p-1 text-center bg-transparent outline-none font-bold" value={row.g4} onChange={e => handlePointChange(i, 'g4', e.target.value)} /></td>
                                            <td className="p-0 bg-yellow-200"><input type="number" className="w-16 h-[22px] p-1 text-center bg-transparent outline-none font-bold" value={row.g5} onChange={e => handlePointChange(i, 'g5', e.target.value)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-200"/>

                {/* ANEXO II */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="font-bold uppercase flex items-center gap-2 text-slate-700 mb-2"><FileText size={16}/> Anexo II: Descripción de Pruebas</h4>
                    <p className="text-[10px] text-slate-500 mb-2">Este texto se imprimirá en una hoja adicional al final del certificado PDF.</p>
                    <textarea 
                        className="w-full h-32 border border-slate-300 rounded-lg p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Ej: Método de Comparación con balanza patrón..."
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
