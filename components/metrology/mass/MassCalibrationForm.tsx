'use strict'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Plus, Trash2, Loader2, FileText, Scale } from 'lucide-react'

// Utilidades Estadísticas
function calculateStdDev(arr: number[]) {
    if (!arr || arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sumSquares = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    return Math.sqrt(sumSquares / (arr.length - 1));
}

function calculateEmt(clase: string, divMinimas: number, e: number) {
    let emt = 0;
    const c = clase.toLowerCase();
    
    if (c.includes('ordinaria') || c.includes('iiii')) {
        if (divMinimas <= 50) emt = e * 0.5;
        else if (divMinimas <= 200) emt = e * 1.0;
        else emt = e * 1.5;
    } 
    else if (c.includes('media') || c.includes('iii')) {
        if (divMinimas <= 500) emt = e * 0.5;
        else if (divMinimas <= 2000) emt = e * 1.0;
        else emt = e * 1.5;
    } 
    else if (c.includes('fina') || c.includes('alta') || c.includes('ii')) {
        if (divMinimas <= 5000) emt = e * 0.5;
        else if (divMinimas <= 20000) emt = e * 1.0;
        else emt = e * 1.5;
    } 
    else { // Especial I
        if (e < 0.001) {
            if (divMinimas <= 50000) emt = 0.001;
            else if (divMinimas <= 200000) emt = 0.002;
            else emt = 0.003;
        } else {
            if (divMinimas <= 50000) emt = e * 0.5;
            else if (divMinimas <= 200000) emt = e * 1.0;
            else emt = e * 1.5;
        }
    }
    return emt;
}

interface ExactitudPoint {
    nominal: string; i0: string; il: string; 
    dmc: string; u_dmc: string; empuje: string; conveccion: string;
    // Calculated
    emt: number; div_minimas: number; u_dmc_k1: number; rep: number;
    deriva: number; ind_sin: number; ind_con: number; exc_rel: number;
    error: number; uC: number; u_expandida: number;
}

export default function MassCalibrationForm({ itemId, orderId }: { itemId: number, orderId?: string }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [patterns, setPatterns] = useState<any[]>([])

    // Ambiente
    const [env, setEnv] = useState({
        temp_inicial: 22.0, temp_final: 22.0,
        humedad_inicial: 45, humedad_final: 45,
        patron_id: ''
    })

    // Datos del Instrumento
    const [config, setConfig] = useState({
        clase: 'Fina II', // Especial I, Fina II, Media III, Ordinaria IIII
        max: 1000,
        e: 0.1,
        d: 0.1,
        unidad: 'g'
    })

    // Pruebas Previas
    const [eccTest, setEccTest] = useState({
        carga: 300,
        lecturas: ['', '', '', '', ''] // Centro, E1, E2, E3, E4
    })
    
    const [rep50Test, setRep50Test] = useState({
        carga: 500,
        lecturas: ['', '', '', '', '']
    })

    const [rep100Test, setRep100Test] = useState({
        carga: 1000,
        lecturas: ['', '', '', '', '']
    })

    // Cálculos Previos
    const calcEccentricity = () => {
        const vals = eccTest.lecturas.map(Number).filter(n => !isNaN(n));
        if (vals.length < 2) return 0;
        const maxDiff = Math.max(...vals) - Math.min(...vals); // Simplificación: usualmente es max diff contra centro
        const valCentro = vals[0] || eccTest.carga;
        const diffsCentro = vals.slice(1).map(v => Math.abs(v - valCentro));
        const maxE = diffsCentro.length > 0 ? Math.max(...diffsCentro) : 0;
        
        // u(ecc) relativo = diff_max / (2 * carga * sqrt(3))
        if (eccTest.carga === 0) return 0;
        return maxE / (2 * eccTest.carga * Math.sqrt(3));
    }

    const calcRepeatability = () => {
        const v50 = rep50Test.lecturas.map(Number).filter(n => !isNaN(n));
        const v100 = rep100Test.lecturas.map(Number).filter(n => !isNaN(n));
        const std50 = v50.length > 1 ? calculateStdDev(v50) : 0;
        const std100 = v100.length > 1 ? calculateStdDev(v100) : 0;
        return Math.max(std50, std100);
    }

    const uEccRelativo = calcEccentricity();
    const sMaxRep = calcRepeatability();

    // Puntos de Exactitud
    const createEmptyPoint = (): ExactitudPoint => ({
        nominal: '', i0: '0', il: '', dmc: '0', u_dmc: '0', empuje: '0', conveccion: '0',
        emt: 0, div_minimas: 0, u_dmc_k1: 0, rep: 0, deriva: 0, ind_sin: 0, ind_con: 0, exc_rel: 0,
        error: 0, uC: 0, u_expandida: 0
    })

    const [points, setPoints] = useState<ExactitudPoint[]>([
        createEmptyPoint(), createEmptyPoint(), createEmptyPoint(), createEmptyPoint(), createEmptyPoint()
    ])

    const [anexo, setAnexo] = useState("")

    useEffect(() => {
        async function loadPatterns() {
            const { data } = await supabase.from('patterns').select('*').eq('estatus', 'Activo')
            setPatterns(data || [])
        }
        loadPatterns()
    }, [])

    const handlePointChange = (idx: number, field: keyof ExactitudPoint, value: string) => {
        setPoints(prev => {
            const arr = [...prev]
            arr[idx] = recalculatePoint({ ...arr[idx], [field]: value })
            return arr
        })
    }

    // Al cambiar una prueba previa, recalcular toda la tabla
    useEffect(() => {
        setPoints(prev => prev.map(pt => recalculatePoint(pt)))
    }, [config, eccTest, rep50Test, rep100Test])

    const recalculatePoint = (pt: ExactitudPoint): ExactitudPoint => {
        const nom = parseFloat(pt.nominal) || 0;
        const i0 = parseFloat(pt.i0) || 0;
        const il = parseFloat(pt.il) || 0;
        const dmc = parseFloat(pt.dmc) || 0;
        const u_dmc_input = parseFloat(pt.u_dmc) || 0;
        const emp = parseFloat(pt.empuje) || 0;
        const conv = parseFloat(pt.conveccion) || 0;

        if (nom === 0 && il === 0) return { ...pt };

        // Matemáticas de EURAMET cg-18 (replicando hoja de Excel)
        const divMinimas = nom / (config.e || 1);
        const emt = calculateEmt(config.clase, divMinimas, config.e);
        
        const u_dmc_k1 = u_dmc_input; // H59: J88 -> u(dmc) del certificado
        const rep = sMaxRep / Math.sqrt(5); // I59: I49/SQRT(5)
        const deriva = (2 * u_dmc_k1) / Math.sqrt(3); // K59
        const ind_sin = config.d / (2 * Math.sqrt(3)); // L59
        const ind_con = config.d / (2 * Math.sqrt(3)); // M59
        const exc = uEccRelativo * il; // P59
        
        const error = il - nom - dmc; // Q59: IL - (Nominal + dmc)
        
        const uC_sq = Math.pow(rep, 2) + Math.pow(u_dmc_k1, 2) + Math.pow(deriva, 2) + 
                      Math.pow(ind_sin, 2) + Math.pow(ind_con, 2) + Math.pow(emp, 2) + 
                      Math.pow(conv, 2) + Math.pow(exc, 2);
                      
        const uC = Math.sqrt(uC_sq);
        const u_expandida = uC * 2;

        return {
            ...pt, emt, div_minimas: divMinimas, u_dmc_k1, rep, deriva,
            ind_sin, ind_con, exc_rel: exc, error, uC, u_expandida
        }
    }

    const addPoint = () => setPoints(prev => [...prev, recalculatePoint(createEmptyPoint())])
    const removePoint = (idx: number) => setPoints(prev => prev.filter((_, i) => i !== idx))

    const handleSave = async () => {
        setLoading(true)
        try {
            const { error: resError } = await supabase.from('calibration_results').insert({
                item_id: itemId,
                temp_inicial: env.temp_inicial, temp_final: env.temp_final,
                humedad_inicial: env.humedad_inicial, humedad_final: env.humedad_final,
                patron_id: Number(env.patron_id) || null,
                observaciones: anexo,
                datos_calibracion: {
                    tipo: 'MASA',
                    configuracion: config,
                    eccentricity: eccTest,
                    repeatability50: rep50Test,
                    repeatability100: rep100Test,
                    puntos: points
                },
                fecha_calibracion: new Date().toISOString()
            })

            if (resError) throw resError

            await supabase.from('service_order_items').update({ 
                estatus_tecnico: 'Terminado', 
                fecha_finalizacion: new Date().toISOString(),
                magnitud: 'Masa'
            }).eq('id', itemId)

            alert("✅ Calibración de Masa guardada con éxito.")
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
            <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
                <h3 className="font-bold text-indigo-800 uppercase flex items-center gap-2 text-sm">
                    <Scale size={18} className="text-indigo-600"/> CALIBRACIÓN DE BALANZAS / MASA
                </h3>
            </div>

            <div className="p-4 space-y-8">
                {/* BLOQUE 1: DATOS DEL INSTRUMENTO Y AMBIENTE */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Clase de Exactitud</label>
                        <select className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold text-indigo-700" 
                            value={config.clase} onChange={e => setConfig({...config, clase: e.target.value})}>
                            <option value="Especial I">Especial I</option>
                            <option value="Fina II">Fina II</option>
                            <option value="Media III">Media III</option>
                            <option value="Ordinaria IIII">Ordinaria IIII</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Alcance Máx (Max)</label>
                        <input type="number" className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold"
                            value={config.max} onChange={e => setConfig({...config, max: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Div. Verificación (e)</label>
                        <input type="number" className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold text-indigo-700"
                            value={config.e} onChange={e => setConfig({...config, e: parseFloat(e.target.value)})} step="0.00001"/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Div. Escala (d)</label>
                        <input type="number" className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none font-bold text-indigo-700"
                            value={config.d} onChange={e => setConfig({...config, d: parseFloat(e.target.value)})} step="0.00001"/>
                    </div>
                </div>

                {/* BLOQUE 2: PRUEBAS PREVIAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Excentricidad */}
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <div className="bg-slate-100 p-2 border-b border-slate-300 text-center font-bold text-slate-700">Prueba de Carga Excéntrica</div>
                        <div className="p-2 space-y-2 bg-yellow-50">
                            <div className="flex items-center gap-2">
                                <span className="w-16">Carga:</span>
                                <input type="number" className="w-full border p-1 text-center bg-white" value={eccTest.carga} onChange={e => setEccTest({...eccTest, carga: parseFloat(e.target.value)})} />
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                                {eccTest.lecturas.map((l, i) => (
                                    <input key={i} type="number" className="w-full border p-1 text-center bg-white text-[9px]" placeholder={`P${i+1}`}
                                        value={l} onChange={e => {
                                            const arr = [...eccTest.lecturas]; arr[i] = e.target.value;
                                            setEccTest({...eccTest, lecturas: arr});
                                        }} />
                                ))}
                            </div>
                            <div className="text-right text-slate-500 text-[9px]">u(ecc) rel: {(uEccRelativo).toExponential(2)}</div>
                        </div>
                    </div>

                    {/* Repetibilidad 50% */}
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <div className="bg-slate-100 p-2 border-b border-slate-300 text-center font-bold text-slate-700">Repetibilidad (~50%)</div>
                        <div className="p-2 space-y-2 bg-yellow-50">
                            <div className="flex items-center gap-2">
                                <span className="w-16">Carga:</span>
                                <input type="number" className="w-full border p-1 text-center bg-white" value={rep50Test.carga} onChange={e => setRep50Test({...rep50Test, carga: parseFloat(e.target.value)})} />
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                                {rep50Test.lecturas.map((l, i) => (
                                    <input key={i} type="number" className="w-full border p-1 text-center bg-white text-[9px]" placeholder={`L${i+1}`}
                                        value={l} onChange={e => {
                                            const arr = [...rep50Test.lecturas]; arr[i] = e.target.value;
                                            setRep50Test({...rep50Test, lecturas: arr});
                                        }} />
                                ))}
                            </div>
                            {/* Dummy stddev view */}
                        </div>
                    </div>

                    {/* Repetibilidad 100% */}
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <div className="bg-slate-100 p-2 border-b border-slate-300 text-center font-bold text-slate-700">Repetibilidad (~100%)</div>
                        <div className="p-2 space-y-2 bg-yellow-50">
                            <div className="flex items-center gap-2">
                                <span className="w-16">Carga:</span>
                                <input type="number" className="w-full border p-1 text-center bg-white" value={rep100Test.carga} onChange={e => setRep100Test({...rep100Test, carga: parseFloat(e.target.value)})} />
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                                {rep100Test.lecturas.map((l, i) => (
                                    <input key={i} type="number" className="w-full border p-1 text-center bg-white text-[9px]" placeholder={`L${i+1}`}
                                        value={l} onChange={e => {
                                            const arr = [...rep100Test.lecturas]; arr[i] = e.target.value;
                                            setRep100Test({...rep100Test, lecturas: arr});
                                        }} />
                                ))}
                            </div>
                            <div className="text-right text-slate-500 text-[9px]">S max: {sMaxRep.toFixed(5)}</div>
                        </div>
                    </div>
                </div>

                {/* BLOQUE 3: LA GRAN TABLA DE INCERTIDUMBRES */}
                <div className="border-2 border-black overflow-hidden bg-white">
                    <div className="bg-slate-200 text-slate-800 p-2 text-center font-bold text-sm border-b-2 border-black tracking-widest uppercase">
                        Tabla de Incertidumbres (Exactitud)
                    </div>
                    <div className="w-full overflow-x-auto pb-4">
                        <table className="text-center text-[9px] whitespace-nowrap border-collapse min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom bg-yellow-100">Carga<br/>Nominal</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom bg-yellow-100">I0<br/>(Cero)</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom bg-yellow-100">IL<br/>(Lectura)</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom bg-yellow-100 text-blue-700">Masa Conv.<br/>Patrón (dmc)</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom bg-yellow-100 text-blue-700">u(dmc)<br/>Patrón k=1</th>
                                    
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">Error<br/>Max. Tol.</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">Div.<br/>Minimas</th>
                                    
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">Repeti-<br/>bilidad</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">Deriva<br/>pesas</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">Ind.<br/>sin carga</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">Ind.<br/>con carga</th>
                                    
                                    <th className="border-r border-b-2 border-black p-1 align-bottom bg-yellow-100 text-indigo-700">Empuje<br/>aire</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom bg-yellow-100 text-indigo-700">Convección</th>
                                    
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">Carga<br/>excéntrica</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom font-bold text-red-600 bg-red-50">ERROR</th>
                                    <th className="border-r border-b-2 border-black p-1 align-bottom text-slate-500">u comb.</th>
                                    <th className="p-1 border-b-2 border-black align-bottom font-bold text-purple-700 bg-purple-50">U k=2<br/>Expandida</th>
                                    <th className="p-1 border-b-2 border-black"></th>
                                </tr>
                            </thead>
                            <tbody className="border-t-2 border-black">
                                {points.map((pt, i) => (
                                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-200">
                                        <td className="border-r border-black p-0 bg-yellow-50">
                                            <input type="number" className="w-16 h-full p-1.5 text-center bg-transparent outline-none font-bold" value={pt.nominal} onChange={e => handlePointChange(i, 'nominal', e.target.value)} />
                                        </td>
                                        <td className="border-r border-black p-0 bg-yellow-50">
                                            <input type="number" className="w-14 h-full p-1.5 text-center bg-transparent outline-none" value={pt.i0} onChange={e => handlePointChange(i, 'i0', e.target.value)} />
                                        </td>
                                        <td className="border-r border-black p-0 bg-yellow-50">
                                            <input type="number" className="w-16 h-full p-1.5 text-center bg-transparent outline-none font-bold text-slate-700" value={pt.il} onChange={e => handlePointChange(i, 'il', e.target.value)} />
                                        </td>
                                        <td className="border-r border-black p-0 bg-yellow-50">
                                            <input type="number" className="w-16 h-full p-1.5 text-center bg-transparent outline-none text-blue-700 font-bold" value={pt.dmc} onChange={e => handlePointChange(i, 'dmc', e.target.value)} step="0.000001"/>
                                        </td>
                                        <td className="border-r border-black p-0 bg-yellow-50">
                                            <input type="number" className="w-16 h-full p-1.5 text-center bg-transparent outline-none text-blue-700" value={pt.u_dmc} onChange={e => handlePointChange(i, 'u_dmc', e.target.value)} step="0.000001"/>
                                        </td>
                                        
                                        <td className="border-r border-black p-1 text-slate-500">{pt.emt.toFixed(5)}</td>
                                        <td className="border-r border-black p-1 text-slate-500">{pt.div_minimas.toFixed(0)}</td>
                                        
                                        <td className="border-r border-black p-1 text-slate-500">{(pt.rep).toExponential(2)}</td>
                                        <td className="border-r border-black p-1 text-slate-500">{(pt.deriva).toExponential(2)}</td>
                                        <td className="border-r border-black p-1 text-slate-500">{(pt.ind_sin).toExponential(2)}</td>
                                        <td className="border-r border-black p-1 text-slate-500">{(pt.ind_con).toExponential(2)}</td>
                                        
                                        <td className="border-r border-black p-0 bg-yellow-50">
                                            <input type="number" className="w-14 h-full p-1.5 text-center bg-transparent outline-none text-indigo-700" value={pt.empuje} onChange={e => handlePointChange(i, 'empuje', e.target.value)} step="0.000001"/>
                                        </td>
                                        <td className="border-r border-black p-0 bg-yellow-50">
                                            <input type="number" className="w-14 h-full p-1.5 text-center bg-transparent outline-none text-indigo-700" value={pt.conveccion} onChange={e => handlePointChange(i, 'conveccion', e.target.value)} step="0.000001"/>
                                        </td>
                                        
                                        <td className="border-r border-black p-1 text-slate-500">{(pt.exc_rel).toExponential(2)}</td>
                                        
                                        <td className="border-r border-black p-1 font-bold text-red-600 bg-red-50">{pt.error.toFixed(5)}</td>
                                        <td className="border-r border-black p-1 text-slate-500">{(pt.uC).toExponential(2)}</td>
                                        <td className="p-1 font-bold text-purple-700 bg-purple-50">{pt.u_expandida.toFixed(6)}</td>
                                        <td className="p-1">
                                            <button onClick={() => removePoint(i)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button onClick={addPoint} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-700 flex items-center gap-2 shadow transition-all">
                        <Plus size={16}/> Agregar Fila
                    </button>
                </div>

                <hr className="border-slate-200"/>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg shadow-indigo-200 transition disabled:opacity-50 text-sm">
                        {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Calibración
                    </button>
                </div>
            </div>
        </div>
    )
}
