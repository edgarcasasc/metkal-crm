'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Thermometer, CheckCircle2, XCircle, RefreshCcw, Loader2, AlertTriangle, Flame } from 'lucide-react'

export default function TemperatureCalibrationForm({ itemId, orderId }: { itemId: number, orderId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [patterns, setPatterns] = useState<any[]>([])
  
  // Estado del Entorno
  const [env, setEnv] = useState({
    temp_inicial: 23.0, temp_final: 23.2,
    humedad_inicial: 45, humedad_final: 45,
    presion_atmosferica: 1013,
    patron_id: '',
    medio_calibracion: 'Bloque Seco' // Nuevo campo específico de Temperatura
  })

  // Especificaciones del Termómetro
  const [specs, setSpecs] = useState({
    rango_min: 0,
    rango_max: 200,
    resolucion: 0.1, // En temp se llama resolución, no división mínima
    tolerancia_cliente: 1.0, // +/- Grados Celsius
    unidad: '°C'
  })

  const [points, setPoints] = useState<any[]>([])

  useEffect(() => {
    // Cargar patrones (Filtramos por los que sean de Temperatura si tuvieras esa distinción)
    async function loadPatterns() {
        const { data } = await supabase.from('patterns').select('*').eq('estatus', 'Activo')
        setPatterns(data || [])
    }
    loadPatterns()
    
    // Generar 3 puntos por defecto (Min, Medio, Max)
    generatePoints(0, 200)
  }, [])

  const generatePoints = (min: number, max: number) => {
      // Puntos típicos: 10%, 50%, 90% del rango para evitar extremos físicos difíciles
      const span = max - min
      const p1 = parseFloat((min + (span * 0.1)).toFixed(1))
      const p2 = parseFloat((min + (span * 0.5)).toFixed(1))
      const p3 = parseFloat((min + (span * 0.9)).toFixed(1))
      
      const newPoints = [p1, p2, p3].map(val => ({
          nominal: val,    // Lo que programamos en el baño
          patron: '',      // Lo que dice el patrón (Referencia)
          instrumento: '', // Lo que marca el equipo bajo prueba
          error: 0,
          incertidumbre: 0 // Simplificado
      }))
      setPoints(newPoints)
  }

  const handleReadingChange = (index: number, field: 'patron' | 'instrumento', value: string) => {
      const newPoints = [...points]
      newPoints[index][field] = value
      
      const valPatron = parseFloat(newPoints[index].patron)
      const valInst = parseFloat(newPoints[index].instrumento)

      if (!isNaN(valPatron) && !isNaN(valInst)) {
          // Error = Instrumento - Patrón
          newPoints[index].error = parseFloat((valInst - valPatron).toFixed(2))
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
              // Guardamos la estructura específica de TEMPERATURA
              datos_calibracion: {
                  tipo: 'TEMPERATURA', // Etiqueta para saber cómo renderizar el PDF después
                  specs,
                  medio: env.medio_calibracion,
                  tolerancia: specs.tolerancia_cliente,
                  puntos: points
              },
              fecha_calibracion: new Date().toISOString()
          })

          if (resError) throw resError

          await supabase.from('service_order_items').update({ 
              estatus_tecnico: 'Terminado', 
              fecha_finalizacion: new Date().toISOString(),
              magnitud: 'Temperatura' // Forzamos magnitud correcta
          }).eq('id', itemId)

          alert("✅ Calibración de Temperatura guardada.")
          window.location.reload()

      } catch (e: any) {
          alert("Error: " + e.message)
      } finally {
          setLoading(false)
      }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* HEADER ROJO (Para distinguir de Presión que es Azul) */}
        <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
            <h3 className="font-bold text-orange-800 uppercase flex items-center gap-2">
                <Thermometer size={18} className="text-orange-600"/> Captura de Temperatura
            </h3>
            <div className="text-xs font-mono bg-orange-100 text-orange-700 px-2 py-1 rounded border border-orange-200">
                Tolerancia: ± {specs.tolerancia_cliente} {specs.unidad}
            </div>
        </div>

        <div className="p-6 space-y-8">
            
            {/* 1. CONFIGURACIÓN */}
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
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Resolución</label>
                    <input type="number" className="w-full border rounded p-1.5 text-sm" 
                        value={specs.resolucion} onChange={(e) => setSpecs({...specs, resolucion: parseFloat(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Tolerancia (±)</label>
                    <input type="number" className="w-full border rounded p-1.5 text-sm font-bold text-orange-600" 
                        value={specs.tolerancia_cliente} onChange={(e) => setSpecs({...specs, tolerancia_cliente: parseFloat(e.target.value)})} />
                </div>
                <div className="col-span-4 flex justify-end">
                    <button onClick={() => generatePoints(specs.rango_min, specs.rango_max)} className="text-[10px] flex items-center gap-1 bg-slate-100 px-3 py-1 rounded hover:bg-slate-200 font-bold uppercase">
                        <RefreshCcw size={10}/> Generar Puntos (10%, 50%, 90%)
                    </button>
                </div>
            </div>

            <hr className="border-slate-100"/>

            {/* 2. AMBIENTE + MEDIO */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-slate-50 p-4 rounded-lg">
                {/* Campos ambientales estándar... */}
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase">T. Amb (°C)</label><input type="number" className="w-full bg-white border rounded p-1 text-xs" value={env.temp_inicial} onChange={(e) => setEnv({...env, temp_inicial: parseFloat(e.target.value)})}/></div>
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase">Humedad (%)</label><input type="number" className="w-full bg-white border rounded p-1 text-xs" value={env.humedad_inicial} onChange={(e) => setEnv({...env, humedad_inicial: parseFloat(e.target.value)})}/></div>
                
                {/* CAMPO ESPECÍFICO DE TEMPERATURA */}
                <div className="col-span-2">
                     <label className="block text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Flame size={10}/> Medio Generador</label>
                     <select className="w-full bg-white border rounded p-1 text-xs" value={env.medio_calibracion} onChange={(e) => setEnv({...env, medio_calibracion: e.target.value})}>
                        <option value="Bloque Seco">Bloque Seco (Dry Block)</option>
                        <option value="Baño Líquido">Baño Líquido</option>
                        <option value="Horno">Horno</option>
                        <option value="Ambiental">Ambiental</option>
                     </select>
                </div>

                <div className="col-span-2">
                     <label className="block text-[9px] font-bold text-slate-400 uppercase">Patrón</label>
                     <select className="w-full bg-white border border-orange-300 rounded p-1 text-xs outline-none" value={env.patron_id} onChange={(e) => setEnv({...env, patron_id: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {patterns.map(p => <option key={p.id} value={p.id}>{p.clave} - {p.marca}</option>)}
                     </select>
                </div>
            </div>

            {/* 3. TABLA DE CALIBRACIÓN (Diferente a Presión) */}
            <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                    <thead className="bg-slate-800 text-white uppercase font-bold">
                        <tr>
                            <th className="p-2">Punto Set</th>
                            <th className="p-2 bg-orange-100 text-orange-900 border-l border-orange-200">Lectura Patrón</th>
                            <th className="p-2 bg-orange-50 text-orange-900 border-r border-orange-200">Lectura Equipo</th>
                            <th className="p-2">Error</th>
                            <th className="p-2">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {points.map((pt, i) => {
                            const isPass = Math.abs(pt.error) <= specs.tolerancia_cliente
                            return (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-2 font-bold text-slate-500">{pt.nominal} °C</td>
                                    
                                    {/* INPUT PATRÓN */}
                                    <td className="p-2 border-l border-slate-100 bg-orange-50/50">
                                        <input 
                                            type="number" 
                                            className="w-full text-center p-1 border border-orange-200 rounded text-orange-900 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="Ref"
                                            value={pt.patron}
                                            onChange={(e) => handleReadingChange(i, 'patron', e.target.value)}
                                        />
                                    </td>

                                    {/* INPUT INSTRUMENTO */}
                                    <td className="p-2 border-r border-slate-100 bg-orange-50/30">
                                        <input 
                                            type="number" 
                                            className="w-full text-center p-1 border border-orange-200 rounded text-slate-800 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="UUT"
                                            value={pt.instrumento}
                                            onChange={(e) => handleReadingChange(i, 'instrumento', e.target.value)}
                                        />
                                    </td>

                                    <td className={`p-2 font-mono font-bold ${!isPass ? 'text-red-600' : 'text-slate-600'}`}>
                                        {pt.error > 0 ? '+' : ''}{pt.error}
                                    </td>
                                    <td className="p-2">
                                        {isPass ? <CheckCircle2 size={16} className="mx-auto text-emerald-500"/> : <XCircle size={16} className="mx-auto text-red-500"/>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg shadow-emerald-200 transition disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Temperatura
                </button>
            </div>
        </div>
    </div>
  )
}