'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Zap, Plus, Trash2, Loader2, ListChecks, CheckCircle2, XCircle } from 'lucide-react'
import { calculateMean, calculateStdDev, calculateUncertainty, calculateAverageError } from '@/utils/metrologyMath'

export default function GenericCalibrationForm({ itemId, magnitud }: { itemId: number, magnitud: string }) {
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

  // Specs Flexibles
  const [specs, setSpecs] = useState({
    rango_min: 0,
    rango_max: 100,
    resolucion: 0.01,
    tolerancia: 0.5,
    unidad: 'Unidades'
  })

  // Tabla Dinámica
  const [points, setPoints] = useState<any[]>([])

  useEffect(() => {
    async function loadPatterns() {
        const { data } = await supabase.from('patterns').select('*').eq('estatus', 'Activo')
        setPatterns(data || [])
    }
    loadPatterns()
    // Iniciar con 3 filas vacías
    addPoint(); addPoint(); addPoint();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recalcular incertidumbre si cambia la resolución
  useEffect(() => {
    const newPoints = points.map(row => {
        const tomas = [
            parseFloat(row.toma1), parseFloat(row.toma2), parseFloat(row.toma3), 
            parseFloat(row.toma4), parseFloat(row.toma5)
        ].filter(t => !isNaN(t));

        if (tomas.length > 0) {
            const stdDev = calculateStdDev(tomas);
            row.incertidumbre = calculateUncertainty(stdDev, specs.resolucion, tomas.length);
        }
        return row;
    });
    setPoints(newPoints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs.resolucion])

  const addPoint = () => {
      setPoints(prev => [...prev, { nominal: '', toma1: '', toma2: '', toma3: '', toma4: '', toma5: '', promedio: 0, error: 0, incertidumbre: 0 }])
  }

  const removePoint = (index: number) => {
      setPoints(prev => prev.filter((_, i) => i !== index))
  }

  const handleReading = (index: number, field: string, value: string) => {
      const newPoints = [...points]
      newPoints[index][field] = value
      
      const nominal = parseFloat(newPoints[index].nominal) || 0;
      const tomas = [
          parseFloat(newPoints[index].toma1),
          parseFloat(newPoints[index].toma2),
          parseFloat(newPoints[index].toma3),
          parseFloat(newPoints[index].toma4),
          parseFloat(newPoints[index].toma5)
      ].filter(t => !isNaN(t));

      if (tomas.length > 0) {
          newPoints[index].promedio = calculateMean(tomas);
          newPoints[index].error = calculateAverageError(tomas, nominal);
          
          const stdDev = calculateStdDev(tomas);
          newPoints[index].incertidumbre = calculateUncertainty(stdDev, specs.resolucion, tomas.length);
      } else {
          newPoints[index].promedio = 0;
          newPoints[index].error = 0;
          newPoints[index].incertidumbre = 0;
      }
      setPoints(newPoints)
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
              presion_atmosferica: env.presion_atmosferica,
              patron_id: Number(env.patron_id),
              datos_calibracion: {
                  tipo: 'GENERICO',
                  magnitud_real: magnitud,
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

          alert(`✅ Calibración de ${magnitud} guardada.`)
          window.location.reload()

      } catch (e: any) {
          alert("Error: " + e.message)
      } finally {
          setLoading(false)
      }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* HEADER GRIS OSCURO */}
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                <ListChecks size={18} className="text-slate-500"/> Captura: {magnitud}
            </h3>
            <div className="text-xs font-mono bg-white text-slate-600 px-2 py-1 rounded border border-slate-300">
                Tolerancia: ± {specs.tolerancia} {specs.unidad}
            </div>
        </div>

        <div className="p-6 space-y-6">
            
            {/* 1. CONFIGURACIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Unidad Medida</label><input type="text" className="w-full border rounded p-1.5 text-sm font-bold bg-yellow-50" value={specs.unidad} onChange={(e) => setSpecs({...specs, unidad: e.target.value})} placeholder="Ej: kg, V, Nm" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Rango Máx</label><input type="number" className="w-full border rounded p-1.5 text-sm" value={specs.rango_max} onChange={(e) => setSpecs({...specs, rango_max: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Resolución</label><input type="number" className="w-full border rounded p-1.5 text-sm" value={specs.resolucion} onChange={(e) => setSpecs({...specs, resolucion: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Tolerancia (±)</label><input type="number" className="w-full border rounded p-1.5 text-sm font-bold text-slate-600" value={specs.tolerancia} onChange={(e) => setSpecs({...specs, tolerancia: parseFloat(e.target.value)})} /></div>
                <div>
                     <label className="block text-[9px] font-bold text-slate-400 uppercase">Patrón</label>
                     <select className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs outline-none" value={env.patron_id} onChange={(e) => setEnv({...env, patron_id: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {patterns.map(p => <option key={p.id} value={p.id}>{p.clave} - {p.marca}</option>)}
                     </select>
                </div>
            </div>

            <hr className="border-slate-100"/>

            {/* 2. TABLA GENÉRICA CON 5 TOMAS */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-center text-[10px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                        <tr>
                            <th className="p-2 min-w-[70px]">Patrón<br/>({specs.unidad})</th>
                            <th className="p-2 bg-slate-100">T1</th>
                            <th className="p-2 bg-slate-100">T2</th>
                            <th className="p-2 bg-slate-100">T3</th>
                            <th className="p-2 bg-slate-100">T4</th>
                            <th className="p-2 bg-slate-100">T5</th>
                            <th className="p-2 min-w-[70px]">Promedio</th>
                            <th className="p-2 min-w-[70px]">Error</th>
                            <th className="p-2 min-w-[70px]">Incert.<br/>(k=2)</th>
                            <th className="p-2 w-8">OK</th>
                            <th className="p-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {points.map((row, i) => {
                             const isPass = Math.abs(row.error) <= specs.tolerancia
                             return (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-1">
                                        <input type="number" className="w-16 text-center border-b border-transparent focus:border-blue-500 outline-none bg-transparent font-bold text-blue-800" 
                                            value={row.nominal} onChange={(e) => handleReading(i, 'nominal', e.target.value)} placeholder="0"/>
                                    </td>
                                    <td className="p-1"><input type="number" className="w-14 text-center border border-slate-200 rounded p-1" value={row.toma1} onChange={(e) => handleReading(i, 'toma1', e.target.value)} placeholder="-"/></td>
                                    <td className="p-1"><input type="number" className="w-14 text-center border border-slate-200 rounded p-1" value={row.toma2} onChange={(e) => handleReading(i, 'toma2', e.target.value)} placeholder="-"/></td>
                                    <td className="p-1"><input type="number" className="w-14 text-center border border-slate-200 rounded p-1" value={row.toma3} onChange={(e) => handleReading(i, 'toma3', e.target.value)} placeholder="-"/></td>
                                    <td className="p-1"><input type="number" className="w-14 text-center border border-slate-200 rounded p-1" value={row.toma4} onChange={(e) => handleReading(i, 'toma4', e.target.value)} placeholder="-"/></td>
                                    <td className="p-1"><input type="number" className="w-14 text-center border border-slate-200 rounded p-1" value={row.toma5} onChange={(e) => handleReading(i, 'toma5', e.target.value)} placeholder="-"/></td>
                                    
                                    <td className="p-1 font-mono font-bold text-blue-600 bg-blue-50">{row.promedio.toFixed(4)}</td>
                                    <td className={`p-1 font-mono font-bold ${!isPass ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}>
                                        {row.error > 0 ? '+' : ''}{row.error}
                                    </td>
                                    <td className="p-1 font-mono text-purple-600">±{row.incertidumbre}</td>
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
                <div className="bg-slate-50 p-2 flex justify-center border-t border-slate-100">
                    <button onClick={addPoint} className="text-[10px] flex items-center gap-1 bg-white border border-slate-300 px-3 py-1 rounded shadow-sm hover:bg-slate-100 text-slate-600 font-bold uppercase transition">
                        <Plus size={12}/> Agregar Fila
                    </button>
                </div>
            </div>

            {/* 3. AMBIENTE */}
            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded text-xs text-slate-500">
                <div><span className="font-bold block text-[9px] uppercase">Temp Inicial</span><input type="number" value={env.temp_inicial} onChange={e=>setEnv({...env, temp_inicial: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Temp Final</span><input type="number" value={env.temp_final} onChange={e=>setEnv({...env, temp_final: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Humedad</span><input type="number" value={env.humedad_inicial} onChange={e=>setEnv({...env, humedad_inicial: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Presión</span><input type="number" value={env.presion_atmosferica} onChange={e=>setEnv({...env, presion_atmosferica: +e.target.value})} className="bg-transparent border-b w-12 text-slate-800"/></div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg shadow-emerald-200 transition disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Calibración
                </button>
            </div>
        </div>
    </div>
  )
}