'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Plus, Trash2, Loader2, ListChecks, CheckCircle2, XCircle } from 'lucide-react'
import { calculateMean, calculateStdDev, calculateUncertainty, calculateAverageError } from '@/utils/metrologyMath'

// Mapeo inverso de la tabla de math o fórmulas GUM:
export default function DynamicCalibrationForm({ itemId, magnitud, configJson }: { itemId: number, magnitud: string, configJson: any }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  // Si no hay configuración (porque es una genérica sin setup), usamos valores default seguros
  const config = configJson || {
      muestras: 5,
      errorFormula: 'promedio_menos_nominal',
      uAFormula: 'stddev_div_sqrt_n',
      uAFactor: 1.4,
      uBPatron: 'global',
      hasCmc: false
  }

  const numMuestras = config.muestras || 5

  // Entorno
  const [env, setEnv] = useState({
    temp_inicial: 22.0, temp_final: 22.0,
    humedad_inicial: 45, humedad_final: 45,
    presion_atmosferica: 1013,
    patron_id: ''
  })

  // Specs Flexibles
  const [specs, setSpecs] = useState({
    rango_min: 0,
    rango_max: 100,
    resolucion: 0.01,
    tolerancia: 0.5,
    unidad: 'Unidades',
    incertidumbre_patron_global: 0.1
  })

  // Tabla Dinámica
  const [points, setPoints] = useState<any[]>([])

  useEffect(() => {
    // Iniciar con 3 filas vacías
    addPoint(); addPoint(); addPoint();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recalcular incertidumbre si cambia la resolución o el patrón global
  useEffect(() => {
    const newPoints = points.map(row => recalculatePoint(row, specs));
    setPoints(newPoints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs.resolucion, specs.incertidumbre_patron_global])

  const addPoint = () => {
      setPoints(prev => [...prev, { 
          nominal: '', toma1: '', toma2: '', toma3: '', toma4: '', toma5: '', toma6: '', toma7: '', toma8: '', toma9: '', toma10: '',
          tol_patron: 0, cmc: 0,
          promedio: 0, error: 0, uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0, error_abs: 0 
      }])
  }

  const removePoint = (index: number) => {
      setPoints(prev => prev.filter((_, i) => i !== index))
  }

  const recalculatePoint = (row: any, currentSpecs: any) => {
      const nominal = parseFloat(row.nominal) || 0;
      
      const tomas = [];
      for(let i=1; i<=numMuestras; i++) {
          const t = parseFloat(row[`toma${i}`]);
          if(!isNaN(t)) tomas.push(t);
      }

      if (tomas.length > 0) {
          const promedio = calculateMean(tomas);
          
          // 1. Cálculo de Error Dinámico
          let error = 0;
          if (config.errorFormula === 'nominal_menos_promedio') {
              error = nominal - promedio;
          } else {
              error = promedio - nominal;
          }
          
          const stdDev = calculateStdDev(tomas);
          
          // 2. Repetibilidad (Tipo A - uA)
          let uA = 0;
          if (config.uAFormula === 'stddev_mult_factor') {
              uA = stdDev * (config.uAFactor || 1);
          } else {
              // stddev_div_sqrt_n
              uA = stdDev / Math.sqrt(tomas.length > 1 ? tomas.length : 1);
          }

          // 3. Tolerancia de Patrón (Tipo B - uB_patron)
          let uB_patron = 0;
          if (config.uBPatron === 'per_point') {
              uB_patron = (parseFloat(row.tol_patron) || 0) / 2; // Distribución normal k=2
          } else {
              uB_patron = currentSpecs.incertidumbre_patron_global / 2;
          }

          // 4. Resolución (Tipo B - uB_resol)
          // Rectangular: resolucion / (2 * sqrt(3)) == resolucion / sqrt(12)
          const uB_resol = currentSpecs.resolucion / Math.sqrt(12);

          const uC = Math.sqrt(Math.pow(uA, 2) + Math.pow(uB_patron, 2) + Math.pow(uB_resol, 2));
          const U_expandida = 2 * uC;

          return {
              ...row, promedio, error, error_abs: Math.abs(error),
              uA, uB_patron, uB_resol, uC, U_expandida
          }
      } else {
          return {
              ...row, promedio: 0, error: 0, error_abs: 0,
              uA: 0, uB_patron: 0, uB_resol: 0, uC: 0, U_expandida: 0
          }
      }
  }

  const handleReading = (index: number, field: string, value: string) => {
      const newPoints = [...points]
      newPoints[index][field] = value
      
      newPoints[index] = recalculatePoint(newPoints[index], specs)
      setPoints(newPoints)
  }

  const handleSave = async () => {
      setLoading(true)
      try {
          const { error: resError } = await supabase.from('calibration_results').insert({
              item_id: itemId,
              temp_inicial: env.temp_inicial,
              temp_final: env.temp_final,
              humedad_inicial: env.humedad_inicial,
              humedad_final: env.humedad_final,
              presion_atmosferica: env.presion_atmosferica,
              datos_calibracion: {
                  tipo: 'DINAMICO',
                  magnitud_real: magnitud,
                  configuracion_formulas: config,
                  specs,
                  puntos: points
              },
              fecha_calibracion: new Date().toISOString()
          })

          if (resError) throw resError

          await supabase.from('service_order_items').update({ 
              estatus_tecnico: 'Terminado', 
              fecha_finalizacion: new Date().toISOString(),
              magnitud: magnitud
          }).eq('id', itemId)

          alert(`✅ Calibración Dinámica de ${magnitud} guardada.`)
          window.location.reload()

      } catch (e: any) {
          alert("Error: " + e.message)
      } finally {
          setLoading(false)
      }
  }

  // Generar columnas de tomas dinámicamente
  const tomasColumns = Array.from({length: numMuestras}, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* HEADER GRIS OSCURO */}
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                <ListChecks size={18} className="text-slate-500"/> Captura Dinámica: {magnitud}
            </h3>
            <div className="flex gap-2">
                <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-300">n = {numMuestras}</span>
                <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-300">
                    Error: {config.errorFormula === 'promedio_menos_nominal' ? 'x - nominal' : 'nominal - x'}
                </span>
            </div>
        </div>

        <div className="p-4 space-y-6">
            
            {/* 1. CONFIGURACIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Unidad</label><input type="text" className="w-full border rounded p-1.5 text-sm font-bold bg-yellow-50 outline-none" value={specs.unidad} onChange={(e) => setSpecs({...specs, unidad: e.target.value})} placeholder="Ej: kg, V" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Rango Máx</label><input type="number" className="w-full border rounded p-1.5 text-sm outline-none" value={specs.rango_max} onChange={(e) => setSpecs({...specs, rango_max: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Resolución</label><input type="number" className="w-full border rounded p-1.5 text-sm outline-none" value={specs.resolucion} onChange={(e) => setSpecs({...specs, resolucion: parseFloat(e.target.value)})} step="0.001" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Tolerancia (±)</label><input type="number" className="w-full border rounded p-1.5 text-sm font-bold text-slate-600 outline-none" value={specs.tolerancia} onChange={(e) => setSpecs({...specs, tolerancia: parseFloat(e.target.value)})} step="0.01"/></div>
                
                {config.uBPatron === 'global' && (
                    <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-blue-600 uppercase">Tolerancia Patrón (uB Global)</label>
                        <input type="number" className="w-full border border-blue-300 rounded p-1.5 text-sm font-bold bg-blue-50 outline-none" value={specs.incertidumbre_patron_global} onChange={(e) => setSpecs({...specs, incertidumbre_patron_global: parseFloat(e.target.value)})} step="0.001"/>
                    </div>
                )}
            </div>

            <hr className="border-slate-100"/>

            {/* 2. TABLA DINÁMICA */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-center text-[10px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase whitespace-nowrap">
                        <tr>
                            <th className="p-2 border-r">Patrón<br/>({specs.unidad})</th>
                            {tomasColumns.map(n => (
                                <th key={n} className="p-2 bg-slate-100 border-r">T{n}</th>
                            ))}
                            
                            <th className="p-2 border-r bg-white">Promedio</th>
                            
                            {config.uBPatron === 'per_point' && (
                                <th className="p-2 border-r bg-yellow-50 text-blue-800">Tol. Patrón<br/>(uB)</th>
                            )}
                            
                            <th className="p-2 border-r text-slate-400">uA</th>
                            <th className="p-2 border-r text-slate-400">uB p.</th>
                            <th className="p-2 border-r text-slate-400">uB r.</th>
                            <th className="p-2 border-r font-bold text-purple-700">U exp.<br/>(k=2)</th>
                            
                            {config.hasCmc && (
                                <th className="p-2 border-r bg-yellow-50 text-blue-800">Incert.<br/>CMC</th>
                            )}

                            <th className="p-2 border-r">Error</th>
                            <th className="p-2 border-r">Error +U</th>
                            <th className="p-2 border-r">Error -U</th>
                            <th className="p-2 w-8">OK</th>
                            <th className="p-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {points.map((row, i) => {
                             const threshold = config.hasCmc ? parseFloat(row.cmc) || 0 : row.U_expandida;
                             const errorPlusU = row.error + threshold;
                             const errorMinusU = row.error - threshold;
                             const isPass = Math.abs(row.error) <= specs.tolerancia; // Pass simple, se puede ajustar

                             return (
                                <tr key={i} className="hover:bg-slate-50 bg-white">
                                    <td className="p-0 border-r">
                                        <input type="number" className="w-16 h-full p-2 text-center outline-none bg-transparent font-bold text-blue-800" 
                                            value={row.nominal} onChange={(e) => handleReading(i, 'nominal', e.target.value)} placeholder="0"/>
                                    </td>
                                    
                                    {tomasColumns.map(n => (
                                        <td key={n} className="p-0 border-r bg-yellow-50">
                                            <input type="number" className="w-14 h-full p-2 text-center outline-none bg-transparent" 
                                                value={row[`toma${n}`]} onChange={(e) => handleReading(i, `toma${n}`, e.target.value)} placeholder="-"/>
                                        </td>
                                    ))}
                                    
                                    <td className="p-1 font-mono font-bold text-blue-600 bg-white border-r">{row.promedio.toFixed(3)}</td>
                                    
                                    {config.uBPatron === 'per_point' && (
                                        <td className="p-0 border-r bg-yellow-100">
                                            <input type="number" step="0.0001" className="w-16 h-full p-2 text-center outline-none bg-transparent font-bold text-blue-700" 
                                                value={row.tol_patron} onChange={(e) => handleReading(i, 'tol_patron', e.target.value)}/>
                                        </td>
                                    )}

                                    <td className="p-1 text-slate-400 border-r">{row.uA.toFixed(4)}</td>
                                    <td className="p-1 text-slate-400 border-r">{row.uB_patron.toFixed(4)}</td>
                                    <td className="p-1 text-slate-400 border-r">{row.uB_resol.toFixed(4)}</td>
                                    <td className="p-1 font-bold text-purple-700 border-r bg-purple-50">{row.U_expandida.toFixed(5)}</td>
                                    
                                    {config.hasCmc && (
                                        <td className="p-0 border-r bg-yellow-100">
                                            <input type="number" step="0.001" className="w-16 h-full p-2 text-center outline-none bg-transparent font-bold text-blue-700" 
                                                value={row.cmc} onChange={(e) => handleReading(i, 'cmc', e.target.value)}/>
                                        </td>
                                    )}

                                    <td className={`p-1 font-mono font-bold border-r ${!isPass ? 'text-red-600 bg-red-50' : 'text-slate-800'}`}>
                                        {row.error > 0 ? '+' : ''}{row.error.toFixed(3)}
                                    </td>
                                    <td className="p-1 border-r text-slate-500">{errorPlusU.toFixed(3)}</td>
                                    <td className="p-1 border-r text-slate-500">{errorMinusU.toFixed(3)}</td>

                                    <td className="p-1">
                                         {row.nominal !== '' && (!isNaN(parseFloat(row.toma1))) && (isPass ? <CheckCircle2 size={14} className="mx-auto text-emerald-500"/> : <XCircle size={14} className="mx-auto text-red-500"/>)}
                                    </td>
                                    <td className="p-1">
                                        <button onClick={() => removePoint(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                    </td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
                <div className="bg-slate-50 p-2 flex justify-center border-t border-slate-200">
                    <button onClick={addPoint} className="text-[10px] flex items-center gap-1 bg-white border border-slate-300 px-3 py-1 rounded shadow-sm hover:bg-slate-100 text-slate-600 font-bold uppercase transition">
                        <Plus size={12}/> Agregar Fila
                    </button>
                </div>
            </div>

            {/* 3. AMBIENTE */}
            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded text-xs text-slate-500 border border-slate-200">
                <div><span className="font-bold block text-[9px] uppercase">Temp Inicial</span><input type="number" value={env.temp_inicial} onChange={e=>setEnv({...env, temp_inicial: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800 outline-none"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Temp Final</span><input type="number" value={env.temp_final} onChange={e=>setEnv({...env, temp_final: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800 outline-none"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Humedad</span><input type="number" value={env.humedad_inicial} onChange={e=>setEnv({...env, humedad_inicial: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800 outline-none"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Presión</span><input type="number" value={env.presion_atmosferica} onChange={e=>setEnv({...env, presion_atmosferica: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800 outline-none"/></div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg shadow-emerald-200 transition disabled:opacity-50 text-sm">
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Calibración
                </button>
            </div>
        </div>
    </div>
  )
}