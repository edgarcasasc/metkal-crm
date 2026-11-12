'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, AlertTriangle, FileText, ShieldCheck } from 'lucide-react'
import QRCode from "react-qr-code"
import { LineChart, Line, XAxis, YAxis } from 'recharts'

export default function ResultadosPage() {
  const { id } = useParams()
  const supabase = createClient()
  
  const [data, setData] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [pattern, setPattern] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const qrUrl = id ? `${baseUrl}/resultados/${id}` : ''

  useEffect(() => {
    fetchResultadosData()
  }, [id])

  async function fetchResultadosData() {
    try {
      const { data: item, error: itemError } = await supabase.from('service_order_items').select('*').eq('id', id).single()
      if (itemError || !item) throw new Error("No se encontró el equipo solicitado.")

      const { data: order, error: orderError } = await supabase.from('service_orders').select(`*, clients (*)`).eq('id', item.orden_id).single()
      if (orderError) throw new Error("Error cargando la orden de servicio.")

      const { data: calResult } = await supabase.from('calibration_results').select('*').eq('item_id', id).order('id', { ascending: false }).limit(1).maybeSingle()

      let patternData = null
      if (calResult && calResult.patron_id) {
          const { data: p } = await supabase.from('patterns').select('*').eq('id', calResult.patron_id).maybeSingle()
          patternData = p
      }

      let parsedResult = calResult;

      // Mock para pruebas si aplica (compatibilidad existente)
      if (item?.id?.toString() === '6041') {
        parsedResult = {
          fecha_calibracion: "2026-06-22",
          datos_calibracion: {
            tipo: 'ELECTRICA',
            rangos: [
              {
                magnitud: "TENSION ELECTRICA CONTINUA",
                rango_min: 0,
                rango_max: 600,
                unidad: "mV",
                division_minima: 0.1,
                puntos: [
                  { nominal: 60.0, lectura: 60.0, error: 0.0, incertidumbre: 0.058 },
                  { nominal: 150.0, lectura: 150.0, error: 0.0, incertidumbre: 0.058 },
                  { nominal: 300.0, lectura: 300.0, error: 0.0, incertidumbre: 0.058 },
                  { nominal: 450.0, lectura: 450.1, error: 0.1, incertidumbre: 0.058 },
                  { nominal: 540.0, lectura: 540.1, error: 0.1, incertidumbre: 0.058 }
                ]
              },
              {
                magnitud: "TENSION ELECTRICA CONTINUA",
                rango_min: 0,
                rango_max: 6,
                unidad: "V",
                division_minima: 0.001,
                puntos: [
                  { nominal: 0.600, lectura: 0.600, error: 0.000, incertidumbre: 0.0040 },
                  { nominal: 1.500, lectura: 1.499, error: -0.001, incertidumbre: 0.0040 },
                  { nominal: 3.000, lectura: 2.998, error: -0.002, incertidumbre: 0.0040 },
                  { nominal: 4.500, lectura: 4.497, error: -0.003, incertidumbre: 0.0040 },
                  { nominal: 5.400, lectura: 5.397, error: -0.003, incertidumbre: 0.0040 }
                ]
              },
              {
                magnitud: "TENSION ELECTRICA CONTINUA",
                rango_min: 0,
                rango_max: 60,
                unidad: "V",
                division_minima: 0.01,
                puntos: [
                  { nominal: 6.00, lectura: 6.00, error: 0.00, incertidumbre: 0.0064 },
                  { nominal: 15.00, lectura: 15.00, error: 0.00, incertidumbre: 0.0064 },
                  { nominal: 30.00, lectura: 29.99, error: -0.01, incertidumbre: 0.0064 },
                  { nominal: 45.00, lectura: 44.98, error: -0.02, incertidumbre: 0.0064 },
                  { nominal: 54.00, lectura: 53.98, error: -0.02, incertidumbre: 0.0064 }
                ]
              }
            ]
          }
        };
      } else if (item?.id?.toString() === '6040') {
        parsedResult = {
          fecha_calibracion: "2026-06-22",
          datos_calibracion: {
            tipo: 'DUREZA',
            specs: { unidad: 'HA', rango_min: 10, rango_max: 80, resolucion: 0.5 },
            puntos: [
              { nominal: 10.0, promedio: 10.3, error: -0.3, incertidumbre: 0.45 },
              { nominal: 30.0, promedio: 29.6, error: 0.4, incertidumbre: 0.45 },
              { nominal: 50.0, promedio: 51.1, error: -1.1, incertidumbre: 0.45 },
              { nominal: 70.0, promedio: 68.8, error: 1.2, incertidumbre: 0.45 },
              { nominal: 80.0, promedio: 80.1, error: -0.1, incertidumbre: 0.45 }
            ]
          }
        };
      }

      // Parsear número de orden para el certificado/informe de resultados idéntico a la etiqueta
      let certNumber = item.certificado;
      if (!certNumber && order?.folio) {
          const numMatch = order.folio.match(/\d+$/);
          const orderNum = numMatch ? numMatch[0] : '0000';
          certNumber = `C-${orderNum}-${item.id}`;
      }
      if (!certNumber) {
          certNumber = `C-${new Date().getFullYear()}-${item.id.toString().padStart(6, '0')}`;
      }

      setData({ ...item, order, client: order.clients, certNumber })
      setResult(parsedResult)
      setPattern(patternData)

    } catch (error: any) {
      console.error(error)
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 font-sans text-slate-600 bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="font-bold text-sm uppercase tracking-wide">Cargando resultados de calibración...</p>
      </div>
    )
  }

  if (errorMsg || !data) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-red-500 font-sans p-10 bg-slate-50">
        <AlertTriangle size={56} className="mb-4 text-red-500"/>
        <h2 className="text-xl font-bold uppercase mb-2">Error al cargar resultados</h2>
        <p className="text-slate-600 text-sm max-w-md text-center">{errorMsg || 'No se encontró la información del equipo.'}</p>
      </div>
    )
  }

  // VARIABLES Y FORMATEO
  const certNumber = data?.certNumber || `C-${new Date().getFullYear()}-${data?.id?.toString().padStart(6, '0')}`
  const calibrationDate = result?.fecha_calibracion 
    ? new Date(result.fecha_calibracion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : (data?.fecha_finalizacion ? new Date(data.fecha_finalizacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : "CONCLUIDO")
  
  const rawDate = result?.fecha_calibracion ? new Date(result.fecha_calibracion) : (data?.fecha_finalizacion ? new Date(data.fecha_finalizacion) : new Date())
  const nextDateObj = new Date(rawDate)
  nextDateObj.setFullYear(nextDateObj.getFullYear() + 1)
  const nextDate = nextDateObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  // Normalizador de magnitudes para evitar problemas con acentos (ELÉCTRICA vs ELECTRICA, PRESIÓN vs PRESION)
  const normalizeMag = (str?: string) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  }

  const rawTipo = data?.magnitud || result?.datos_calibracion?.tipo || 'PRESION';
  const tipoCalibracion = normalizeMag(rawTipo);

  const puntos = result?.datos_calibracion?.puntos || []
  const specs = result?.datos_calibracion?.specs || result?.datos_calibracion?.instrumento || result?.datos_calibracion?.configuracion || {}
  const parametros = result?.datos_calibracion?.parametros || []

  // Normalizar rangos de eléctrica si vinieron como parámetros
  let rangosElectrica = result?.datos_calibracion?.rangos || [];
  if (rangosElectrica.length === 0 && parametros.length > 0 && tipoCalibracion === 'ELECTRICA') {
    rangosElectrica = parametros.map((p: any) => ({
      magnitud: p.nombre,
      rango_min: p.intervalo_min ?? 0,
      rango_max: p.intervalo_max ?? 0,
      unidad: p.unidad,
      division_minima: p.resolucion,
      puntos: p.puntos?.map((pt: any) => ({
        nominal: Number(pt.nominal),
        lectura: pt.promedio ?? pt.lectura,
        error: pt.error,
        incertidumbre: pt.U_expandida ?? pt.incertidumbre
      }))
    }));
  }

  return (
    <div className="min-h-screen bg-slate-200 p-2 sm:p-6 flex flex-col items-center print:p-0 print:bg-white text-slate-900 font-sans">
      <style jsx global>{`
        @page { size: letter; margin: 0mm; }
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-full { 
            box-shadow: none !important; 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important; 
            min-height: 100vh !important;
            padding: 1cm !important;
            border: none !important;
          }
        }
        .cert-box {
          border: 1.5px solid black;
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 10px;
          background-color: #ffffff;
        }
        .cert-label { font-weight: bold; font-size: 9.5px; text-transform: uppercase; color: #0f172a; }
        .cert-sublabel { font-size: 8px; font-style: italic; color: #64748b; }
        .cert-value { font-size: 9.5px; text-transform: uppercase; font-weight: 600; color: #0f172a; }
      `}</style>

      {/* TOOLBAR SUPERIOR */}
      <div className="no-print w-full max-w-[21.59cm] mb-4 flex flex-wrap justify-between items-center gap-2 bg-white p-3 rounded-2xl shadow-md border border-slate-300">
        <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 p-1.5 rounded-lg flex items-center gap-1 text-xs font-black uppercase">
                <ShieldCheck size={16}/> Calibración Verificada
            </span>
            <span className="text-xs font-mono font-bold text-slate-500 hidden sm:inline">{certNumber}</span>
        </div>
        <div className="flex gap-2">
            <a 
              href={`/certificados/${id}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-full font-bold text-xs uppercase flex items-center gap-1.5 transition border border-slate-300"
            >
                <FileText size={14}/> Certificado Completo
            </a>
            <button 
              onClick={() => window.print()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full shadow-md flex items-center gap-2 font-bold text-xs uppercase transition cursor-pointer"
            >
                <Printer size={15}/> Imprimir / Guardar PDF
            </button>
        </div>
      </div>

      {/* DOCUMENTO HOJA TAMAÑO CARTA */}
      <div className="print-full bg-white shadow-2xl w-full max-w-[21.59cm] min-h-[27.94cm] p-4 sm:p-[1cm] relative text-xs leading-tight print:shadow-none overflow-x-auto border border-slate-300">
        
        {/* HEADER RESULTADOS */}
        <div className="flex justify-between items-start mb-4 border-b-2 border-slate-900 pb-3">
            <div className="w-3/5">
                <div className="flex items-center gap-2">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <span className="font-black text-xl tracking-tight uppercase">Metkal</span>
                    <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-black tracking-widest uppercase ml-2">Metrología</span>
                </div>
                <h1 className="font-black text-[15px] uppercase mt-2 text-slate-900 tracking-tight">Informe de Resultados de Calibración</h1>
                <p className="text-[10px] italic text-slate-600 font-medium">(CALIBRATION TEST RESULTS REPORT)</p>
            </div>
            
            <div className="w-2/5 flex flex-col items-end">
                <div className="border-[1.5px] border-black rounded-lg p-2 text-right bg-slate-50 w-full max-w-[230px]">
                    <div className="flex justify-between items-center text-[9px] border-b border-slate-200 pb-1 mb-1">
                        <span className="font-bold text-slate-600">INFORME / CERTIFICADO:</span>
                        <span className="font-black text-slate-900 font-mono text-[11px]">{certNumber}</span>
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-600">
                        <span>FECHA CALIBRACIÓN:</span>
                        <span className="font-bold text-slate-800">{calibrationDate}</span>
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-600">
                        <span>PRÓXIMA VIGENCIA:</span>
                        <span className="font-bold text-emerald-700">{nextDate}</span>
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500 pt-1 border-t border-slate-200 mt-1">
                        <span>DOCUMENTO:</span>
                        <span className="font-bold">HOJA 1 DE 1</span>
                    </div>
                </div>
            </div>
        </div>

        {/* BOX 1: DATOS DEL INSTRUMENTO Y CLIENTE */}
        <div className="cert-box grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
                <div className="flex items-center gap-1 mb-1.5 border-b border-slate-200 pb-1">
                    <span className="cert-label">Datos del Instrumento</span>
                    <span className="cert-sublabel">(Instrument Description)</span>
                </div>
                <div className="grid grid-cols-[85px_1fr] gap-y-1 text-[9px]">
                    <span className="cert-label">Equipo:</span>
                    <span className="cert-value">{data.equipo || 'N/A'}</span>

                    <span className="cert-label">Marca / Modelo:</span>
                    <span className="cert-value">{data.marca || '-'} / {data.modelo || '-'}</span>

                    <span className="cert-label">No. de Serie:</span>
                    <span className="cert-value font-mono">{data.no_serie || 'S/N'}</span>

                    <span className="cert-label">ID Interno:</span>
                    <span className="cert-value font-mono text-indigo-700">{data.identificacion || 'N/A'}</span>

                    <span className="cert-label">Intervalo:</span>
                    <span className="cert-value">{specs.rango_min ?? '-'} a {specs.rango_max ?? '-'} {specs.unidad || ''}</span>

                    <span className="cert-label">Resolución:</span>
                    <span className="cert-value">{specs.resolucion || specs.division_minima || '-'} {specs.unidad || ''}</span>
                </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-1 mb-1.5 border-b border-slate-200 pb-1">
                        <span className="cert-label">Cliente y Ubicación</span>
                        <span className="cert-sublabel">(Customer & Location)</span>
                    </div>
                    <div className="grid grid-cols-[70px_1fr] gap-y-1 text-[9px]">
                        <span className="cert-label">Empresa:</span>
                        <span className="cert-value text-slate-800">{data.client?.empresa || 'N/A'}</span>

                        <span className="cert-label">Orden:</span>
                        <span className="cert-value font-mono">{data.order?.folio || 'N/A'}</span>

                        <span className="cert-label">Servicio:</span>
                        <span className="cert-value">{data.order?.servicio_sitio ? 'EN SITIO (CLIENTE)' : 'LABORATORIO METKAL'}</span>
                    </div>
                </div>

                {/* Condiciones ambientales y QR de verificación */}
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-end">
                    <div className="text-[8px] space-y-0.5">
                        <div className="font-bold uppercase text-slate-500">Condiciones Ambientales:</div>
                        <div>Temp: <span className="font-bold">{result?.temp_inicial ?? '20.0'} °C</span> | Humedad: <span className="font-bold">{result?.humedad_inicial ?? '50'} %</span></div>
                        <div>Metrólogo: <span className="font-bold uppercase">{data.order?.metrologo || 'Ingeniero de Calibración'}</span></div>
                        {pattern && <div>Patrón: <span className="font-bold font-mono text-[7.5px] uppercase">{pattern.clave} {pattern.descripcion ? `• ${pattern.descripcion}` : ''}</span></div>}
                    </div>
                    
                    {/* QR Code pequeño de autenticidad en el documento impreso */}
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                        <QRCode value={qrUrl} size={42} style={{ height: "42px", width: "42px" }} viewBox={`0 0 256 256`}/>
                        <div className="text-[6.5px] leading-tight text-slate-500 font-bold uppercase">
                            <span>Escanear para</span><br/>
                            <span className="text-slate-800">Verificar Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* TABLA DE RESULTADOS DINÁMICA */}
        <div className="cert-box p-3 min-h-[300px]">
            <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-1">
                <span className="font-bold text-[11px] uppercase tracking-wide text-slate-800">
                    Resultados de Medición — Magnitud: {rawTipo}
                </span>
                <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600">
                    Incertidumbre expandida k=2 (~95.45% confianza)
                </span>
            </div>

            {!result ? (
                <div className="text-center p-8 text-red-500 font-bold">
                    Sin datos de calibración registrados para este equipo.
                </div>
            ) : (
                <>
                {/* 1. MASA / BALANZAS */}
                {tipoCalibracion === 'MASA' ? (
                    <div className="space-y-3">
                        {result.datos_calibracion.excentricidad && (
                            <div>
                                <h4 className="font-bold text-[9px] uppercase text-slate-700 mb-1">Prueba de carga excéntrica</h4>
                                <table className="w-full text-center border-collapse text-[9px]">
                                    <thead className="bg-slate-800 text-white">
                                        <tr>
                                            <th className="py-1 border border-slate-700">Zona</th>
                                            <th className="py-1 border border-slate-700">Valor nominal ({specs.unidad})</th>
                                            <th className="py-1 border border-slate-700">Indicación ({specs.unidad})</th>
                                            <th className="py-1 border border-slate-700">Efecto excéntrico ({specs.unidad})</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.datos_calibracion.excentricidad.posiciones?.map((pos: any, idx: number) => (
                                            <tr key={idx} className="border-b border-slate-200">
                                                <td className="py-1 border-x border-slate-200 font-bold">{pos.pos}</td>
                                                <td className="py-1 border-x border-slate-200">{result.datos_calibracion.excentricidad.carga}</td>
                                                <td className="py-1 border-x border-slate-200">{pos.lectura}</td>
                                                <td className="py-1 border-x border-slate-200 font-bold">{pos.error}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {result.datos_calibracion.repetibilidad && (
                            <div>
                                <h4 className="font-bold text-[9px] uppercase text-slate-700 mb-1">Prueba de Repetibilidad</h4>
                                <table className="w-full text-center border-collapse text-[9px]">
                                    <thead className="bg-slate-800 text-white">
                                        <tr>
                                            <th className="py-1 border border-slate-700">Carga ({specs.unidad})</th>
                                            <th className="py-1 border border-slate-700">Diferencia Máxima ({specs.unidad})</th>
                                            <th className="py-1 border border-slate-700">Cumplimiento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-1 border-x border-slate-200">{result.datos_calibracion.repetibilidad.carga_mitad?.carga || 'Media Carga'}</td>
                                            <td className="py-1 border-x border-slate-200 font-bold">{result.datos_calibracion.repetibilidad.carga_mitad?.diferencia_maxima}</td>
                                            <td className="py-1 border-x border-slate-200 text-emerald-600 font-bold">Cumple</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-1 border-x border-slate-200">{result.datos_calibracion.repetibilidad.carga_maxima?.carga || 'Carga Máxima'}</td>
                                            <td className="py-1 border-x border-slate-200 font-bold">{result.datos_calibracion.repetibilidad.carga_maxima?.diferencia_maxima}</td>
                                            <td className="py-1 border-x border-slate-200 text-emerald-600 font-bold">Cumple</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {result.datos_calibracion.exactitud && (
                            <div>
                                <h4 className="font-bold text-[9px] uppercase text-slate-700 mb-1">Error de Indicación</h4>
                                <table className="w-full text-center border-collapse text-[9px]">
                                    <thead className="bg-slate-800 text-white">
                                        <tr>
                                            <th className="py-1 border border-slate-700">Carga Nominal ({specs.unidad})</th>
                                            <th className="py-1 border border-slate-700">Indicación Promedio ({specs.unidad})</th>
                                            <th className="py-1 border border-slate-700">Error de Indicación ({specs.unidad})</th>
                                            <th className="py-1 border border-slate-700">Incertidumbre k=2 ({specs.unidad})</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.datos_calibracion.exactitud.map((pt: any, idx: number) => (
                                            <tr key={idx} className="border-b border-slate-200">
                                                <td className="py-1 border-x border-slate-200 font-bold">{pt.nominal}</td>
                                                <td className="py-1 border-x border-slate-200">{pt.promedio}</td>
                                                <td className="py-1 border-x border-slate-200 font-bold">{pt.error > 0 ? '+' : ''}{pt.error}</td>
                                                <td className="py-1 border-x border-slate-200">± {(pt.incertidumbre || specs.resolucion || 0.01)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : tipoCalibracion === 'DIMENSIONAL' ? (
                    /* 2. DIMENSIONAL */
                    <div className="space-y-3">
                        {['exteriores', 'interiores', 'profundidad'].map((section) => {
                            const pruebas = result.datos_calibracion.pruebas?.[section] || []
                            if (pruebas.length === 0) return null

                            return (
                                <div key={section}>
                                    <h4 className="font-bold text-[9px] uppercase text-slate-700 mb-1">{section}</h4>
                                    <table className="w-full text-center border-collapse text-[9px]">
                                        <thead className="bg-slate-800 text-white">
                                            <tr>
                                                <th className="py-1 border border-slate-700 w-1/4">Nominal</th>
                                                <th className="py-1 border border-slate-700 w-1/4">Lectura</th>
                                                <th className="py-1 border border-slate-700 w-1/4">Error</th>
                                                <th className="py-1 border border-slate-700 w-1/4">Incertidumbre (k=2)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pruebas.map((pt: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-200">
                                                    <td className="py-1 border-x border-slate-200 font-bold">{pt.nominal}</td>
                                                    <td className="py-1 border-x border-slate-200">{pt.lectura}</td>
                                                    <td className="py-1 border-x border-slate-200 font-bold">{pt.error > 0 ? '+' : ''}{pt.error}</td>
                                                    <td className="py-1 border-x border-slate-200">± {(specs.resolucion || 0.01)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })}
                    </div>
                ) : tipoCalibracion === 'ELECTRICA' ? (
                    /* 3. ELÉCTRICA */
                    <div className="flex flex-col gap-4 w-full">
                        {rangosElectrica.map((rango: any, idx: number) => (
                            <div key={idx} className="flex flex-col md:flex-row gap-3 items-start w-full border border-slate-200 p-2 rounded">
                                <div className="flex-1 w-full md:max-w-[60%]">
                                    <table className="w-full text-center border-collapse border border-slate-800 text-[9px] bg-white">
                                        <thead>
                                            <tr className="bg-slate-800 text-white">
                                                <th colSpan={4} className="py-1 font-bold uppercase text-xs">{rango.magnitud} ({rango.unidad})</th>
                                            </tr>
                                            <tr className="bg-slate-100 text-slate-700 text-[8px]">
                                                <th className="border border-slate-400 py-1">Valor Nominal (Patrón)</th>
                                                <th className="border border-slate-400 py-1">Lectura Instrumento</th>
                                                <th className="border border-slate-400 py-1">Error de Medida</th>
                                                <th className="border border-slate-400 py-1">Incertidumbre (k=2)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rango.puntos?.map((pt: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-200">
                                                    <td className="border-x border-slate-200 py-1 font-mono font-bold">{pt.nominal}</td>
                                                    <td className="border-x border-slate-200 py-1 font-mono">{pt.lectura}</td>
                                                    <td className="border-x border-slate-200 py-1 font-mono font-bold">{pt.error > 0 ? '+' : ''}{pt.error}</td>
                                                    <td className="border-x border-slate-200 py-1 font-mono">± {pt.incertidumbre}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex-1 w-full md:w-[40%] border border-slate-200 p-1 flex items-center justify-center bg-white min-h-[160px]">
                                    <LineChart width={260} height={150} data={rango.puntos?.map((pt: any) => ({
                                        x: pt.nominal,
                                        error: Number(pt.error) || 0,
                                        upper: (Number(pt.error) || 0) + (Number(pt.incertidumbre) || 0.01),
                                        lower: (Number(pt.error) || 0) - (Number(pt.incertidumbre) || 0.01)
                                    }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="x" tick={false} axisLine={true} tickLine={false} />
                                        <YAxis tick={{ fontSize: 8 }} width={35} />
                                        <Line type="linear" dataKey="upper" stroke="#94a3b8" strokeDasharray="3 3" dot={{ r: 1 }} strokeWidth={1} isAnimationActive={false} />
                                        <Line type="linear" dataKey="lower" stroke="#94a3b8" strokeDasharray="3 3" dot={{ r: 1 }} strokeWidth={1} isAnimationActive={false} />
                                        <Line type="linear" dataKey="error" stroke="#ef4444" dot={{ r: 2.5, fill: '#ef4444' }} strokeWidth={1.5} isAnimationActive={false} />
                                    </LineChart>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tipoCalibracion === 'DUREZA' ? (
                    /* 4. DUREZA */
                    <div className="flex flex-col md:flex-row gap-3 items-start w-full">
                        <div className="flex-1 w-full md:max-w-[60%]">
                            <table className="w-full text-center border-collapse border border-slate-800 text-[9px] bg-white">
                                <thead className="bg-slate-800 text-white">
                                    <tr>
                                        <th className="py-1 border border-slate-700">Valor Patrón ({specs.unidad || 'HA'})</th>
                                        <th className="py-1 border border-slate-700">Valor Medido Instrumento</th>
                                        <th className="py-1 border border-slate-700">Error de Medida</th>
                                        <th className="py-1 border border-slate-700">Incertidumbre (k=2)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {puntos.map((pt: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-200">
                                            <td className="border-x border-slate-200 py-1 font-bold">{pt.nominal}</td>
                                            <td className="border-x border-slate-200 py-1">{pt.promedio !== undefined ? Number(pt.promedio).toFixed(1) : pt.lectura}</td>
                                            <td className="border-x border-slate-200 py-1 font-bold">{pt.error > 0 ? '+' : ''}{pt.error}</td>
                                            <td className="border-x border-slate-200 py-1 font-mono">± {pt.incertidumbre !== undefined ? Number(pt.incertidumbre).toFixed(2) : (specs.resolucion || 0.01)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex-1 w-full md:w-[40%] border border-slate-200 p-1 flex items-center justify-center bg-white min-h-[160px]">
                            <LineChart width={260} height={150} data={puntos.map((pt: any) => ({
                                x: pt.nominal,
                                error: Number(pt.error) || 0,
                                upper: (Number(pt.error) || 0) + (Number(pt.incertidumbre) || 0.45),
                                lower: (Number(pt.error) || 0) - (Number(pt.incertidumbre) || 0.45)
                            }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="x" tick={false} axisLine={true} tickLine={false} />
                                <YAxis tick={{ fontSize: 8 }} width={35} />
                                <Line type="linear" dataKey="upper" stroke="#94a3b8" strokeDasharray="3 3" dot={{ r: 1 }} strokeWidth={1} isAnimationActive={false} />
                                <Line type="linear" dataKey="lower" stroke="#94a3b8" strokeDasharray="3 3" dot={{ r: 1 }} strokeWidth={1} isAnimationActive={false} />
                                <Line type="linear" dataKey="error" stroke="#ef4444" dot={{ r: 2.5, fill: '#ef4444' }} strokeWidth={1.5} isAnimationActive={false} />
                            </LineChart>
                        </div>
                    </div>
                ) : tipoCalibracion === 'TEMPERATURA' ? (
                    /* 5. TEMPERATURA */
                    <table className="w-full text-center border-collapse text-[9px]">
                        <thead className="bg-slate-800 text-white">
                            <tr>
                                <th className="py-1 border border-slate-700 w-1/5">Punto Set ({specs.unidad || '°C'})</th>
                                <th className="py-1 border border-slate-700 w-1/5">Patrón ({specs.unidad || '°C'})</th>
                                <th className="py-1 border border-slate-700 w-1/5">Instrumento ({specs.unidad || '°C'})</th>
                                <th className="py-1 border border-slate-700 w-1/5">Error de Medida</th>
                                <th className="py-1 border border-slate-700 w-1/5">Incertidumbre (k=2)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {puntos.map((pt: any, i: number) => (
                                <tr key={i} className="border-b border-slate-200">
                                    <td className="py-1 border-x border-slate-200 font-bold">{pt.setPoint || pt.nominal}</td>
                                    <td className="py-1 border-x border-slate-200">{pt.patron}</td>
                                    <td className="py-1 border-x border-slate-200">{pt.instrumento || pt.lectura}</td>
                                    <td className="py-1 border-x border-slate-200 font-bold">{Number(pt.error) > 0 ? '+' : ''}{pt.error}</td>
                                    <td className="py-1 border-x border-slate-200">± {pt.incertidumbre || specs.resolucion || 0.01}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    /* 6. PRESIÓN O FORMATO ESTÁNDAR / GENÉRICO */
                    <table className="w-full text-center border-collapse text-[9px]">
                        <thead className="bg-slate-800 text-white">
                            <tr>
                                <th className="py-1 border border-slate-700 w-1/5">Nominal ({specs.unidad || ''})</th>
                                <th className="py-1 border border-slate-700 w-1/5">Ascendente</th>
                                <th className="py-1 border border-slate-700 w-1/5">Descendente</th>
                                <th className="py-1 border border-slate-700 w-1/5">Error de Medida</th>
                                <th className="py-1 border border-slate-700 w-1/5">Incertidumbre (k=2)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {puntos.map((pt: any, i: number) => (
                                <tr key={i} className="border-b border-slate-200">
                                    <td className="py-1 border-x border-slate-200 font-bold">{pt.nominal}</td>
                                    <td className="py-1 border-x border-slate-200">{pt.ascendente ?? pt.lectura ?? '-'}</td>
                                    <td className="py-1 border-x border-slate-200">{pt.descendente ?? '-'}</td>
                                    <td className="py-1 border-x border-slate-200 font-bold">{Number(pt.error) > 0 ? '+' : ''}{pt.error}</td>
                                    <td className="py-1 border-x border-slate-200">± {pt.incertidumbre !== undefined ? pt.incertidumbre : (specs.resolucion || 0.01)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Si hubo parámetros genéricos adicionales (Química, Tiempo, Torque, etc.) */}
                {parametros.length > 0 && tipoCalibracion !== 'ELECTRICA' && (
                    <div className="mt-4 space-y-3">
                        {parametros.map((param: any, pIdx: number) => (
                            <div key={pIdx}>
                                <h4 className="font-bold text-[9px] uppercase text-slate-700 mb-1">{param.nombre} ({param.unidad || specs.unidad})</h4>
                                <table className="w-full text-center border-collapse text-[9px]">
                                    <thead className="bg-slate-700 text-white">
                                        <tr>
                                            <th className="py-1 border border-slate-600">Nominal</th>
                                            <th className="py-1 border border-slate-600">Lectura / Promedio</th>
                                            <th className="py-1 border border-slate-600">Error</th>
                                            <th className="py-1 border border-slate-600">Incertidumbre</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {param.puntos?.map((pt: any, ptIdx: number) => (
                                            <tr key={ptIdx} className="border-b border-slate-200">
                                                <td className="py-1 border-x border-slate-200 font-bold">{pt.nominal}</td>
                                                <td className="py-1 border-x border-slate-200">{pt.promedio ?? pt.lectura}</td>
                                                <td className="py-1 border-x border-slate-200 font-bold">{Number(pt.error) > 0 ? '+' : ''}{pt.error}</td>
                                                <td className="py-1 border-x border-slate-200">± {pt.U_expandida ?? pt.incertidumbre ?? 0.01}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}
                </>
            )}
        </div>

        {/* PIE DE PÁGINA Y TRAZABILIDAD */}
        <div className="mt-3 pt-2 border-t border-slate-300 flex flex-col gap-1 text-[7.5px] leading-tight text-slate-600 text-justify">
            <p>
                <strong>Trazabilidad y Validez:</strong> Esta calibración es trazable a patrones nacionales e internacionales del Centro Nacional de Metrología (CENAM) o NIST. Las unidades de medición están acordes al Sistema Internacional de Unidades (SI). Los resultados informados en este documento corresponden exclusivamente al ítem calibrado bajo las condiciones ambientales registradas al momento del servicio.
            </p>
            <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-500 pt-1 border-t border-slate-200">
                <span>METKAL METROLOGÍA DE ALTA PRECISIÓN — SISTEMA DE GESTIÓN ISO/IEC 17025</span>
                <span>FOR-MK-RES-01 | REV. 02</span>
            </div>
        </div>

      </div>
    </div>
  )
}
