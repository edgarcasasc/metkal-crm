'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, AlertTriangle, Flame, Gauge } from 'lucide-react'
import QRCode from "react-qr-code"

export default function CertificatePage() {
  const { id } = useParams()
  const supabase = createClient()
  
  const [data, setData] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [pattern, setPattern] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/certificados/${id}` : ''

  useEffect(() => {
    fetchCertificateData()
  }, [id])

  async function fetchCertificateData() {
    try {
      const { data: item, error: itemError } = await supabase.from('service_order_items').select('*').eq('id', id).single()
      if (itemError) throw new Error("Error cargando equipo")

      const { data: order, error: orderError } = await supabase.from('service_orders').select(`*, clients (*)`).eq('id', item.orden_id).single()
      if (orderError) throw new Error("Error cargando orden")

      const { data: calResult } = await supabase.from('calibration_results').select('*').eq('item_id', id).order('id', { ascending: false }).limit(1).maybeSingle()

      let patternData = null
      if (calResult && calResult.patron_id) {
          const { data: p } = await supabase.from('patterns').select('*').eq('id', calResult.patron_id).single()
          patternData = p
      }

      setData({ ...item, order, client: order.clients })
      setResult(calResult)
      setPattern(patternData)

    } catch (error: any) {
      console.error(error)
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-blue-600 animate-pulse">Cargando certificado...</div>
  if (errorMsg) return <div className="h-screen flex flex-col items-center justify-center text-red-500 font-bold p-10"><AlertTriangle size={48}/> {errorMsg}</div>

  // VARIABLES
  const certNumber = `C-${new Date().getFullYear()}-${data?.id?.toString().padStart(6, '0')}`
  const calibrationDate = result?.fecha_calibracion ? new Date(result.fecha_calibracion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : "PENDIENTE"
  const nextDate = result?.fecha_calibracion ? new Date(new Date(result.fecha_calibracion).setFullYear(new Date(result.fecha_calibracion).getFullYear() + 1)).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : "PENDIENTE"
  
  const puntos = result?.datos_calibracion?.puntos || []
  const specs = result?.datos_calibracion?.specs || {}
  const tipoCalibracion = result?.datos_calibracion?.tipo || 'PRESION' // Detectamos tipo (por defecto Presion si no existe la etiqueta)

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:p-0 print:bg-white text-slate-900">
      <style jsx global>{` @page { size: letter; margin: 0mm; } @media print { body { background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } } `}</style>

      {/* TOOLBAR */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold text-xs hover:bg-black transition">
            <Printer size={16}/> IMPRIMIR
        </button>
      </div>

      <div className="bg-white shadow-2xl w-[21.59cm] min-h-[27.94cm] p-12 relative text-xs leading-relaxed print:shadow-none print:w-full print:h-full">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
             <div className="w-1/3">
                <img src="/Logo-Horizontal-Color.png" alt="METKAL Logo" className="h-16 w-auto object-contain"/>
            </div>
            <div className="w-1/3 text-center pt-2">
                <h1 className="font-black uppercase text-lg tracking-widest text-slate-800">Certificado</h1>
                <p className="font-bold text-slate-500 text-[9px] uppercase">Laboratorio de {tipoCalibracion}</p>
            </div>
            <div className="w-1/3 flex justify-end items-center gap-4">
                <div className="hidden print:block"><QRCode value={qrUrl} size={48} style={{ height: "auto", maxWidth: "100%", width: "100%" }} /></div>
                <div className="text-right">
                    <span className="block text-sm font-black text-red-600 font-mono">{certNumber}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Original</span>
                    <span className="text-[7px] text-slate-300 font-mono block mt-1">ID: {id}</span>
                </div>
            </div>
        </div>

        {/* INFO CLIENTE Y SERVICIO */}
        <div className="grid grid-cols-2 gap-8 mb-6 text-[10px]">
            <div>
                <h3 className="bg-slate-800 text-white px-2 py-0.5 font-bold uppercase mb-2 inline-block">Cliente</h3>
                <div className="ml-1 space-y-0.5">
                    <div className="flex"><span className="font-bold w-16">Nombre:</span> <span className="uppercase">{data.client?.empresa}</span></div>
                    <div className="flex"><span className="font-bold w-16">Dirección:</span> <span className="uppercase truncate">{data.client?.domicilio || 'N/A'}</span></div>
                    <div className="flex"><span className="font-bold w-16">Ubicación:</span> <span className="uppercase">{data.client?.ciudad}, {data.client?.estado}</span></div>
                </div>
            </div>
            <div>
                <h3 className="bg-slate-800 text-white px-2 py-0.5 font-bold uppercase mb-2 inline-block">Servicio</h3>
                 <div className="ml-1 space-y-0.5">
                    <div className="flex"><span className="font-bold w-20">Orden:</span> <span className="uppercase font-mono font-bold">{data.order?.folio}</span></div>
                    <div className="flex"><span className="font-bold w-20">Fecha Cal:</span> <span>{calibrationDate}</span></div>
                    <div className="flex"><span className="font-bold w-20">Vencimiento:</span> <span>{nextDate}</span></div>
                </div>
            </div>
        </div>

        {/* EQUIPO */}
        <div className="mb-6 border border-slate-200 rounded p-3 bg-slate-50 text-[10px]">
             <h3 className="font-bold text-slate-800 uppercase mb-2 border-b border-slate-200 pb-1">Instrumento bajo prueba</h3>
             <div className="grid grid-cols-3 gap-y-2">
                 <div><span className="block font-bold text-slate-400 text-[8px] uppercase">Descripción</span><span className="uppercase font-bold">{data.equipo}</span></div>
                 <div><span className="block font-bold text-slate-400 text-[8px] uppercase">Marca / Modelo</span><span className="uppercase font-bold">{data.marca} / {data.modelo}</span></div>
                 <div><span className="block font-bold text-slate-400 text-[8px] uppercase">Serie / ID</span><span className="uppercase font-bold">{data.no_serie} / {data.identificacion}</span></div>
                 <div><span className="block font-bold text-slate-400 text-[8px] uppercase">Alcance</span><span className="uppercase font-bold">{specs.rango_min ?? '-'} a {specs.rango_max ?? '-'} {specs.unidad}</span></div>
                 <div>
                    <span className="block font-bold text-slate-400 text-[8px] uppercase">
                        {tipoCalibracion === 'TEMPERATURA' ? 'Resolución' : 'División Mínima'}
                    </span>
                    <span className="uppercase font-bold">{specs.resolucion || specs.division_minima} {specs.unidad}</span>
                 </div>
             </div>
        </div>

        {/* RESULTADOS DINÁMICOS */}
        {/* RESULTADOS DINÁMICOS */}
        <div className="mb-6">
            <h3 className="font-black text-center text-slate-800 uppercase text-xs mb-2 bg-slate-100 py-1">Resultados de Medición</h3>
            
            {!result ? (
                <div className="text-center p-6 text-red-400 font-bold border border-red-100 bg-red-50 rounded">Sin datos registrados.</div>
            ) : (
                <>
                {/* CASO 1: DIMENSIONAL (Múltiples tablas) */}
                {tipoCalibracion === 'DIMENSIONAL' ? (
                    <div className="space-y-4">
                        {['exteriores', 'interiores', 'profundidad'].map((section) => {
                            const pruebas = result.datos_calibracion.pruebas?.[section] || []
                            if (pruebas.length === 0) return null // No mostrar tablas vacías

                            return (
                                <div key={section}>
                                    <h4 className="font-bold text-[9px] uppercase text-slate-500 mb-1 border-b border-slate-100">{section}</h4>
                                    <table className="w-full text-center border-collapse text-[9px]">
                                        <thead className="bg-slate-800 text-white">
                                            <tr>
                                                <th className="py-1 border border-slate-700 w-1/4">Nominal</th>
                                                <th className="py-1 border border-slate-700 w-1/4">Lectura</th>
                                                <th className="py-1 border border-slate-700 w-1/4">Error</th>
                                                <th className="py-1 border border-slate-700 w-1/4">Incertidumbre</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pruebas.map((pt: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-200">
                                                    <td className="py-1 border-x border-slate-200 font-bold">{pt.nominal}</td>
                                                    <td className="py-1 border-x border-slate-200">{pt.lectura}</td>
                                                    <td className={`py-1 border-x border-slate-200 font-bold ${Math.abs(pt.error) > specs.tolerancia ? 'text-red-600' : ''}`}>
                                                        {pt.error > 0 ? '+' : ''}{pt.error}
                                                    </td>
                                                    <td className="py-1 border-x border-slate-200">± {(specs.resolucion || 0.01)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* CASO 2 y 3: PRESIÓN y TEMPERATURA (Tabla única estándar) */
                    <table className="w-full text-center border-collapse text-[9px]">
                        <thead className="bg-slate-800 text-white">
                            {tipoCalibracion === 'TEMPERATURA' ? (
                                <tr>
                                    <th className="py-1 border border-slate-700 w-1/5">Punto Set</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Patrón</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Instrumento</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Error</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Incertidumbre (k=2)</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="py-1 border border-slate-700 w-1/5">Nominal</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Ascendente</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Descendente</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Error Máx</th>
                                    <th className="py-1 border border-slate-700 w-1/5">Incertidumbre (k=2)</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {puntos.map((pt: any, i: number) => {
                             if (tipoCalibracion === 'TEMPERATURA') {
                                 // ... (código temperatura existente)
                             } else if (tipoCalibracion === 'DIMENSIONAL') {
                                 // ... (código dimensional no aplica aquí porque usa tablas separadas)
                             } else if (tipoCalibracion === 'GENERICO') {
                                 // NUEVO: LOGICA GENERICA
                                 return (
                                    <tr key={i} className="border-b border-slate-200">
                                        {/* Usamos las etiquetas flexibles */}
                                        <td className="py-1 border-x border-slate-200 font-bold">{pt.nominal} {specs.unidad}</td>
                                        <td className="py-1 border-x border-slate-200 text-slate-400">-</td> {/* Columna extra vacía o repetimos patrón */}
                                        <td className="py-1 border-x border-slate-200">{pt.lectura}</td>
                                        <td className={`py-1 border-x border-slate-200 font-bold ${Math.abs(pt.error) > specs.tolerancia ? 'text-red-600' : ''}`}>{pt.error}</td>
                                        <td className="py-1 border-x border-slate-200">± {(specs.resolucion || 0.01)}</td>
                                    </tr>
                                 )
                             } else {
                                 // PRESIÓN (Default)
                                 // ...
                             }
                        })}
                        </tbody>
                    </table>
                )}
                </>
            )}
        </div>

        {/* PATRONES Y AMBIENTE */}
        {result && (
            <div className="grid grid-cols-2 gap-8 mb-10 text-[9px]">
                <div>
                    <h4 className="font-bold uppercase border-b border-slate-300 mb-1">Patrón Utilizado</h4>
                    {pattern ? (
                        <div>
                            <span className="font-bold text-blue-900">{pattern.clave}</span> - {pattern.descripcion} ({pattern.marca})
                            <div className="text-[8px] text-slate-500">Trazabilidad: {pattern.trazabilidad}</div>
                        </div>
                    ) : <span className="text-red-400">Patrón no encontrado (ID: {result.patron_id})</span>}
                </div>
                <div>
                    <h4 className="font-bold uppercase border-b border-slate-300 mb-1">Condiciones Ambientales</h4>
                    <div>Temp: {result.temp_inicial} - {result.temp_final} °C</div>
                    <div>Humedad: {result.humedad_inicial} - {result.humedad_final} %HR</div>
                    {/* Dato extra para temperatura */}
                    {result.datos_calibracion.medio && (
                        <div className="mt-1 font-bold text-orange-700">Medio: {result.datos_calibracion.medio}</div>
                    )}
                </div>
            </div>
        )}

        {/* FIRMAS (IGUAL QUE ANTES) */}
        <div className="absolute bottom-10 left-12 right-12 flex justify-between gap-16 text-center">
             <div className="flex-1 border-t border-slate-800 pt-1">
                 <p className="font-bold uppercase text-[9px]">{data.order?.metrologo}</p>
                 <p className="text-[8px] text-slate-500 uppercase font-bold">Metrólogo</p>
             </div>
             <div className="flex-1 border-t border-slate-800 pt-1">
                 <p className="font-bold uppercase text-[9px]">Ing. Sergio Garza</p>
                 <p className="text-[8px] text-slate-500 uppercase font-bold">Gerente Técnico</p>
             </div>
        </div>
      </div>
    </div>
  )
}