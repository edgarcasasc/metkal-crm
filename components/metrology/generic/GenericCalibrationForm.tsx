'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Zap, Plus, Trash2, Loader2, ListChecks, CheckCircle2, XCircle } from 'lucide-react'

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
    unidad: 'Unidades' // Esto el usuario lo puede cambiar (ej. V, A, kg, Nm)
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
  }, [])

  const addPoint = () => {
      setPoints(prev => [...prev, { nominal: '', lectura: '', error: 0 }])
  }

  const removePoint = (index: number) => {
      setPoints(prev => prev.filter((_, i) => i !== index))
  }

  const handleReading = (index: number, field: 'nominal' | 'lectura', value: string) => {
      const newPoints = [...points]
      newPoints[index][field] = value
      
      const nominal = parseFloat(newPoints[index].nominal)
      const lectura = parseFloat(newPoints[index].lectura)

      if (!isNaN(nominal) && !isNaN(lectura)) {
          newPoints[index].error = parseFloat((lectura - nominal).toFixed(4))
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
                  tipo: 'GENERICO', // Para el certificado
                  magnitud_real: magnitud, // Guardamos qué era (Electrica, Masa, etc)
                  specs,
                  puntos: points
              },
              fecha_calibracion: new Date().toISOString()
          })

          if (resError) throw resError

          await supabase.from('service_order_items').update({ 
              estatus_tecnico: 'Terminado', 
              fecha_finalizacion: new Date().toISOString(),
              magnitud: magnitud // Confirmamos la magnitud
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

            {/* 2. TABLA GENÉRICA */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-center text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold">
                        <tr>
                            <th className="p-2 w-1/4">Valor Patrón ({specs.unidad})</th>
                            <th className="p-2 w-1/4">Lectura Instrumento</th>
                            <th className="p-2 w-1/4">Error</th>
                            <th className="p-2 w-10">Estado</th>
                            <th className="p-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {points.map((row, i) => {
                             const isPass = Math.abs(row.error) <= specs.tolerancia
                             return (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-2">
                                        <input type="number" className="w-full text-center border-b border-transparent focus:border-blue-500 outline-none bg-transparent font-bold text-blue-800" 
                                            value={row.nominal} onChange={(e) => handleReading(i, 'nominal', e.target.value)} placeholder="0"/>
                                    </td>
                                    <td className="p-2 bg-slate-50/50">
                                        <input type="number" className="w-full text-center border border-slate-200 rounded p-1 text-slate-900 font-bold outline-none focus:ring-1 focus:ring-slate-500" 
                                            value={row.lectura} onChange={(e) => handleReading(i, 'lectura', e.target.value)} placeholder="0.00"/>
                                    </td>
                                    <td className={`p-2 font-mono font-bold ${!isPass ? 'text-red-600' : 'text-slate-600'}`}>
                                        {row.error > 0 ? '+' : ''}{row.error}
                                    </td>
                                    <td className="p-2">
                                         {row.nominal && row.lectura && (isPass ? <CheckCircle2 size={14} className="mx-auto text-emerald-500"/> : <XCircle size={14} className="mx-auto text-red-500"/>)}
                                    </td>
                                    <td className="p-2">
                                        <button onClick={() => removePoint(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                    </td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
                <div className="bg-slate-50 p-2 flex justify-center">
                    <button onClick={addPoint} className="text-[10px] flex items-center gap-1 bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-100 text-slate-600 font-bold uppercase">
                        <Plus size={12}/> Agregar Fila
                    </button>
                </div>
            </div>

            {/* 3. AMBIENTE */}
            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded text-xs text-slate-500">
                <div><span className="font-bold block text-[9px] uppercase">Temp Inicial</span><input type="number" value={env.temp_inicial} onChange={e=>setEnv({...env, temp_inicial: +e.target.value})} className="bg-transparent border-b w-12"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Temp Final</span><input type="number" value={env.temp_final} onChange={e=>setEnv({...env, temp_final: +e.target.value})} className="bg-transparent border-b w-12"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Humedad</span><input type="number" value={env.humedad_inicial} onChange={e=>setEnv({...env, humedad_inicial: +e.target.value})} className="bg-transparent border-b w-12"/></div>
                <div><span className="font-bold block text-[9px] uppercase">Presión</span><input type="number" value={env.presion_atmosferica} onChange={e=>setEnv({...env, presion_atmosferica: +e.target.value})} className="bg-transparent border-b w-12"/></div>
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