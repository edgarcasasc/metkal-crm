'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Ruler, CheckCircle2, XCircle, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'

export default function DimensionalCalibrationForm({ itemId }: { itemId: number }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [patterns, setPatterns] = useState<any[]>([])
  
  // Entorno
  const [env, setEnv] = useState({
    temp_inicial: 20.0, temp_final: 20.5,
    humedad_inicial: 45, humedad_final: 45,
    presion_atmosferica: 1013,
    patron_id: ''
  })

  // Specs Instrumento
  const [specs, setSpecs] = useState({
    rango_min: 0,
    rango_max: 150,
    resolucion: 0.01,
    tolerancia: 0.02, // Tolerancia general (ej. DIN 862 para 150mm es 0.03 aprox, pero editable)
    unidad: 'mm'
  })

  // Estructura de Pruebas (3 secciones)
  const [tests, setTests] = useState({
      exteriores: [] as any[],
      interiores: [] as any[],
      profundidad: [] as any[]
  })

  useEffect(() => {
    async function loadPatterns() {
        const { data } = await supabase.from('patterns').select('*').eq('estatus', 'Activo')
        setPatterns(data || [])
    }
    loadPatterns()
    
    // Puntos sugeridos iniciales para un Pie de Rey de 150mm
    addPoint('exteriores', 0)
    addPoint('exteriores', 25)
    addPoint('exteriores', 50)
    addPoint('exteriores', 100)
    addPoint('exteriores', 150)
    
    addPoint('interiores', 20) // Se prueba con anillos patrón
    addPoint('profundidad', 25)
  }, [])

  // Agregar fila a una sección
  const addPoint = (section: 'exteriores' | 'interiores' | 'profundidad', val = 0) => {
      setTests(prev => ({
          ...prev,
          [section]: [...prev[section], { nominal: val, lectura: '', error: 0 }]
      }))
  }

  // Eliminar fila
  const removePoint = (section: 'exteriores' | 'interiores' | 'profundidad', index: number) => {
      setTests(prev => ({
          ...prev,
          [section]: prev[section].filter((_, i) => i !== index)
      }))
  }

  // Cambiar valores (Matemática simple: Error = Lectura - Nominal)
  const handleReading = (section: 'exteriores' | 'interiores' | 'profundidad', index: number, field: 'nominal' | 'lectura', value: string) => {
      const newSection = [...tests[section]]
      newSection[index][field] = value
      
      const nominal = parseFloat(newSection[index].nominal)
      const lectura = parseFloat(newSection[index].lectura)

      if (!isNaN(nominal) && !isNaN(lectura)) {
          // Nota: parseFloat().toFixed(2) devuelve string, hay que volver a parsear para guardar número
          newSection[index].error = parseFloat((lectura - nominal).toFixed(3))
      }
      
      setTests(prev => ({ ...prev, [section]: newSection }))
  }

  const handleSave = async () => {
      if (!env.patron_id) return alert("Selecciona el patrón (Juego de Bloques) utilizado")
      
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
                  tipo: 'DIMENSIONAL', // Etiqueta clave
                  specs,
                  pruebas: tests // Guardamos las 3 tablas
              },
              fecha_calibracion: new Date().toISOString()
          })

          if (resError) throw resError

          await supabase.from('service_order_items').update({ 
              estatus_tecnico: 'Terminado', 
              fecha_finalizacion: new Date().toISOString(),
              magnitud: 'Dimensional'
          }).eq('id', itemId)

          alert("✅ Calibración Dimensional guardada.")
          window.location.reload()

      } catch (e: any) {
          alert("Error: " + e.message)
      } finally {
          setLoading(false)
      }
  }

  // Renderizador de Tabla Reutilizable
  const RenderTable = ({ title, section }: { title: string, section: 'exteriores' | 'interiores' | 'profundidad' }) => (
      <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 flex justify-between items-center border-b border-slate-200">
              <h4 className="font-bold text-xs uppercase text-slate-700">{title}</h4>
              <button onClick={() => addPoint(section)} className="text-[10px] flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 text-slate-600">
                  <Plus size={10}/> Agregar Punto
              </button>
          </div>
          <table className="w-full text-center text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold">
                  <tr>
                      <th className="p-2 w-1/4">Nominal (Bloque)</th>
                      <th className="p-2 w-1/4">Lectura Instrumento</th>
                      <th className="p-2 w-1/4">Error</th>
                      <th className="p-2 w-10"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {tests[section].map((row, i) => {
                       const isPass = Math.abs(row.error) <= specs.tolerancia
                       return (
                          <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2">
                                  <input type="number" className="w-full text-center border-b border-transparent focus:border-blue-500 outline-none bg-transparent font-bold" 
                                      value={row.nominal} onChange={(e) => handleReading(section, i, 'nominal', e.target.value)} placeholder="0"/>
                              </td>
                              <td className="p-2 bg-purple-50/50">
                                  <input type="number" className="w-full text-center border border-purple-200 rounded p-1 text-purple-900 font-bold outline-none focus:ring-1 focus:ring-purple-500" 
                                      value={row.lectura} onChange={(e) => handleReading(section, i, 'lectura', e.target.value)} placeholder="0.00"/>
                              </td>
                              <td className={`p-2 font-mono font-bold ${!isPass ? 'text-red-600' : 'text-slate-600'}`}>
                                  {row.error > 0 ? '+' : ''}{row.error}
                              </td>
                              <td className="p-2">
                                  <button onClick={() => removePoint(section, i)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                              </td>
                          </tr>
                       )
                  })}
              </tbody>
          </table>
      </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* HEADER PURPURA */}
        <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
            <h3 className="font-bold text-purple-800 uppercase flex items-center gap-2">
                <Ruler size={18} className="text-purple-600"/> Captura Dimensional
            </h3>
            <div className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200">
                Tolerancia Global: ± {specs.tolerancia} {specs.unidad}
            </div>
        </div>

        <div className="p-6 space-y-6">
            
            {/* 1. CONFIGURACIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Rango Máx</label><input type="number" className="w-full border rounded p-1.5 text-sm font-bold" value={specs.rango_max} onChange={(e) => setSpecs({...specs, rango_max: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Resolución</label><input type="number" className="w-full border rounded p-1.5 text-sm" value={specs.resolucion} onChange={(e) => setSpecs({...specs, resolucion: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase">Tolerancia (±)</label><input type="number" className="w-full border rounded p-1.5 text-sm font-bold text-purple-600" value={specs.tolerancia} onChange={(e) => setSpecs({...specs, tolerancia: parseFloat(e.target.value)})} /></div>
                <div>
                     <label className="block text-[9px] font-bold text-slate-400 uppercase">Patrón (Bloques)</label>
                     <select className="w-full bg-white border border-purple-300 rounded p-1.5 text-xs outline-none" value={env.patron_id} onChange={(e) => setEnv({...env, patron_id: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {patterns.map(p => <option key={p.id} value={p.id}>{p.clave} - {p.marca}</option>)}
                     </select>
                </div>
            </div>

            <hr className="border-slate-100"/>

            {/* 2. TABLAS DE PRUEBAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                    <RenderTable title="Errores en Exteriores (Mordazas)" section="exteriores" />
                </div>
                <div>
                    <RenderTable title="Errores en Interiores" section="interiores" />
                </div>
                <div>
                    <RenderTable title="Errores en Profundidad / Escalón" section="profundidad" />
                </div>
            </div>

            {/* 3. AMBIENTE */}
            <div className="bg-slate-50 p-3 rounded text-xs flex gap-4 items-center justify-center text-slate-500">
                <span><span className="font-bold">Temp:</span> {env.temp_inicial} °C</span>
                <span><span className="font-bold">Humedad:</span> {env.humedad_inicial} %</span>
                <span>(Datos editables en código si se requiere)</span>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg shadow-emerald-200 transition disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Dimensional
                </button>
            </div>
        </div>
    </div>
  )
}