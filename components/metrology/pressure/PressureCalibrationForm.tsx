'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Calculator, CheckCircle2, XCircle, RefreshCcw, Loader2, AlertTriangle } from 'lucide-react'

export default function PressureCalibrationForm({ itemId }: { itemId: number }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [patterns, setPatterns] = useState<any[]>([])
  const [loadingPatterns, setLoadingPatterns] = useState(true)
  
  const [env, setEnv] = useState({
    temp_inicial: 22.5, temp_final: 22.8,
    humedad_inicial: 45, humedad_final: 46,
    presion_atmosferica: 1013,
    patron_id: ''
  })

  const [specs, setSpecs] = useState({
    rango_min: 0,
    rango_max: 100,
    division_minima: 1,
    clase_exactitud: 1.0, 
    unidad: 'psi'
  })

  const [points, setPoints] = useState<any[]>([])

  useEffect(() => {
    async function loadPatterns() {
        try {
            const { data, error } = await supabase.from('patterns').select('*').eq('estatus', 'Activo')
            if (error) console.error("Error cargando patrones:", error)
            setPatterns(data || [])
        } catch (e) {
            console.error("Error fetch patterns:", e)
        } finally {
            setLoadingPatterns(false)
        }
    }
    loadPatterns()
    generatePoints(0, 100)
  }, [])

  const generatePoints = (min: number, max: number) => {
      const span = max - min
      const steps = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
      const newPoints = steps.map(pct => ({
          pct: pct * 100,
          nominal: parseFloat((min + (span * pct)).toFixed(2)),
          ascendente: '',
          descendente: '',
          error_asc: 0,
          error_desc: 0,
          histeresis: 0
      }))
      setPoints(newPoints)
  }

  const handleReadingChange = (index: number, field: 'ascendente' | 'descendente', value: string) => {
      const newPoints = [...points]
      newPoints[index][field] = value
      const val = parseFloat(value)
      const nominal = newPoints[index].nominal

      if (!isNaN(val)) {
          const error = nominal - val
          if (field === 'ascendente') newPoints[index].error_asc = error
          if (field === 'descendente') newPoints[index].error_desc = error
          
          const asc = parseFloat(newPoints[index].ascendente)
          const desc = parseFloat(newPoints[index].descendente)
          if (!isNaN(asc) && !isNaN(desc)) {
             newPoints[index].histeresis = Math.abs(asc - desc)
          }
      }
      setPoints(newPoints)
  }

  const span = specs.rango_max - specs.rango_min
  const tolerancia = (span * specs.clase_exactitud) / 100

  // --- AQUÍ ESTÁ LA CORRECCIÓN DE UX ---
  const handleSave = async () => {
      if (!env.patron_id || env.patron_id === "") {
          alert("⚠️ Error: Debes seleccionar el patrón utilizado de la lista.")
          return
      }
      
      setLoading(true)
      try {
          // 1. Guardar Resultados
          const { error: resError } = await supabase.from('calibration_results').insert({
              item_id: itemId,
              temp_inicial: env.temp_inicial,
              temp_final: env.temp_final,
              humedad_inicial: env.humedad_inicial,
              humedad_final: env.humedad_final,
              presion_atmosferica: env.presion_atmosferica,
              patron_id: Number(env.patron_id),
              datos_calibracion: { specs, tolerancia, puntos: points },
              fecha_calibracion: new Date().toISOString()
          })

          if (resError) throw resError

          // 2. Actualizar Item (Estatus Y AHORA TAMBIÉN LA MAGNITUD)
          const { error: itemError } = await supabase
            .from('service_order_items')
            .update({ 
                estatus_tecnico: 'Terminado', 
                fecha_finalizacion: new Date().toISOString(),
                magnitud: 'Presion' // ✅ AUTO-ASIGNAR MAGNITUD AL GUARDAR
            })
            .eq('id', itemId)

          if (itemError) throw itemError

          alert("✅ Calibración guardada exitosamente.")
          window.location.reload()

      } catch (e: any) {
          alert("Error al guardar: " + e.message)
      } finally {
          setLoading(false)
      }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* HEADER */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                <Calculator size={18} className="text-blue-600"/> Captura de Presión
            </h3>
            <div className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Tolerancia: ± {tolerancia.toFixed(3)} {specs.unidad}
            </div>
        </div>

        <div className="p-6 space-y-8">
            {/* CONFIGURACIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Rango Mín</label>
                    <input type="number" className="w-full border rounded p-1.5 text-sm font-bold" 
                        value={specs.rango_min} onChange={(e) => setSpecs({...specs, rango_min: parseFloat(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Rango Máx</label>
                    <input type="number" className="w-full border rounded p-1.5 text-sm font-bold" 
                        value={specs.rango_max} onChange={(e) => setSpecs({...specs, rango_max: parseFloat(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">División Mín</label>
                    <input type="number" className="w-full border rounded p-1.5 text-sm" 
                        value={specs.division_minima} onChange={(e) => setSpecs({...specs, division_minima: parseFloat(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Clase (%)</label>
                    <input type="number" className="w-full border rounded p-1.5 text-sm font-bold text-blue-600" 
                        value={specs.clase_exactitud} onChange={(e) => setSpecs({...specs, clase_exactitud: parseFloat(e.target.value)})} />
                </div>
            </div>

            <hr className="border-slate-100"/>

            {/* AMBIENTE */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg">
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase">T. Ini (°C)</label><input type="number" className="w-full bg-white border rounded p-1 text-xs" value={env.temp_inicial} onChange={(e) => setEnv({...env, temp_inicial: parseFloat(e.target.value)})}/></div>
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase">T. Fin (°C)</label><input type="number" className="w-full bg-white border rounded p-1 text-xs" value={env.temp_final} onChange={(e) => setEnv({...env, temp_final: parseFloat(e.target.value)})}/></div>
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase">Humedad (%)</label><input type="number" className="w-full bg-white border rounded p-1 text-xs" value={env.humedad_inicial} onChange={(e) => setEnv({...env, humedad_inicial: parseFloat(e.target.value)})}/></div>
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase">Presión (hPa)</label><input type="number" className="w-full bg-white border rounded p-1 text-xs" value={env.presion_atmosferica} onChange={(e) => setEnv({...env, presion_atmosferica: parseFloat(e.target.value)})}/></div>
                <div>
                     <label className="block text-[9px] font-bold text-slate-400 uppercase">Patrón Usado</label>
                     {loadingPatterns ? (
                         <div className="flex items-center gap-1 text-xs text-slate-400"><Loader2 size={12} className="animate-spin"/> Cargando...</div>
                     ) : patterns.length === 0 ? (
                         <div className="text-red-500 text-[10px] font-bold flex items-center gap-1 border border-red-200 bg-red-50 p-1 rounded"><AlertTriangle size={10}/> Sin Patrones</div>
                     ) : (
                         <select className="w-full bg-white border border-blue-300 rounded p-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={env.patron_id} onChange={(e) => setEnv({...env, patron_id: e.target.value})}>
                            <option value="">-- Seleccionar --</option>
                            {patterns.map(p => <option key={p.id} value={p.id}>{p.clave} - {p.marca}</option>)}
                         </select>
                     )}
                </div>
            </div>

            {/* TABLA DE CAPTURA */}
            <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                    <thead className="bg-slate-800 text-white uppercase font-bold">
                        <tr>
                            <th className="p-2 w-16">%</th>
                            <th className="p-2 w-24">Nominal</th>
                            <th className="p-2 bg-blue-900 border-l border-blue-800">Asc</th>
                            <th className="p-2 bg-blue-900 border-r border-blue-800">Desc</th>
                            <th className="p-2">Err Asc</th>
                            <th className="p-2">Err Desc</th>
                            <th className="p-2">Hist</th>
                            <th className="p-2">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {points.map((pt, i) => {
                            const maxError = Math.max(Math.abs(pt.error_asc), Math.abs(pt.error_desc))
                            const isPass = maxError <= tolerancia
                            return (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-2 font-bold text-slate-400">{pt.pct}%</td>
                                    <td className="p-2 font-bold text-slate-700 text-sm">{pt.nominal}</td>
                                    <td className="p-2 border-l border-slate-100 bg-blue-50/30">
                                        <input type="number" className="w-full text-center p-1 border border-blue-200 rounded text-blue-800 font-bold"
                                            placeholder="0.00" value={pt.ascendente} onChange={(e) => handleReadingChange(i, 'ascendente', e.target.value)} />
                                    </td>
                                    <td className="p-2 border-r border-slate-100 bg-blue-50/30">
                                        <input type="number" className="w-full text-center p-1 border border-blue-200 rounded text-blue-800 font-bold"
                                            placeholder="0.00" value={pt.descendente} onChange={(e) => handleReadingChange(i, 'descendente', e.target.value)} />
                                    </td>
                                    <td className={`p-2 font-mono ${Math.abs(pt.error_asc) > tolerancia ? 'text-red-600 font-black' : 'text-slate-500'}`}>{pt.error_asc ? pt.error_asc.toFixed(2) : '-'}</td>
                                    <td className={`p-2 font-mono ${Math.abs(pt.error_desc) > tolerancia ? 'text-red-600 font-black' : 'text-slate-500'}`}>{pt.error_desc ? pt.error_desc.toFixed(2) : '-'}</td>
                                    <td className="p-2 font-mono text-slate-400">{pt.histeresis ? pt.histeresis.toFixed(2) : '-'}</td>
                                    <td className="p-2">{isPass ? <CheckCircle2 size={16} className="mx-auto text-emerald-500"/> : <XCircle size={16} className="mx-auto text-red-500"/>}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
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