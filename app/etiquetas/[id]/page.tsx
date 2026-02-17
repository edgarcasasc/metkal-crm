'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, Loader2 } from 'lucide-react'
import QRCode from "react-qr-code" // 👈 IMPORTANTE

export default function LabelPage() {
  const { id } = useParams()
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // URL para el QR (En producción será tu dominio real, ahora es localhost)
  const qrUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/certificados/${id}` 
    : ''

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    try {
      const { data: item } = await supabase.from('service_order_items').select('*').eq('id', id).single()
      if (!item) throw new Error("Item no encontrado")

      const { data: result } = await supabase.from('calibration_results').select('fecha_calibracion').eq('item_id', id).order('id', { ascending: false }).limit(1).single()
      const { data: order } = await supabase.from('service_orders').select('folio').eq('id', item.orden_id).single()

      setData({ ...item, result, order_folio: order?.folio })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>
  if (!data) return <div className="text-center p-10 font-bold text-red-500">No se encontró el equipo</div>

  const calDate = data.result?.fecha_calibracion ? new Date(data.result.fecha_calibracion) : new Date()
  const nextDate = new Date(calDate)
  nextDate.setFullYear(nextDate.getFullYear() + 1)

  return (
    <div className="min-h-screen bg-slate-200 p-8 flex flex-col items-center justify-center font-sans text-slate-900">
      
      <style jsx global>{`
        @page { size: 10cm 5cm; margin: 0; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <button onClick={() => window.print()} className="no-print mb-8 bg-slate-900 text-white px-6 py-2 rounded-full font-bold uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-black transition">
        <Printer size={16}/> Imprimir Etiqueta
      </button>

      {/* ETIQUETA 10x5 cm */}
      <div className="bg-white w-[10cm] h-[5cm] border border-slate-300 shadow-xl p-2 relative overflow-hidden print:shadow-none print:border-none flex gap-2">
        
        {/* Borde Verde */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>

        {/* COLUMNA IZQUIERDA: DATOS */}
        <div className="flex-1 flex flex-col justify-between pt-2">
            <div>
                <div className="flex justify-between items-start">
                    <div className="font-black text-xl tracking-tighter italic text-slate-800">METKAL</div>
                    <div className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[7px] font-black uppercase border border-emerald-200">
                        CALIBRADO
                    </div>
                </div>
                <div className="mt-1">
                    <div className="text-[9px] font-bold uppercase leading-tight line-clamp-2">{data.equipo}</div>
                    <div className="text-[8px] font-mono text-slate-500 mt-0.5">ID: {data.identificacion}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[8px] border-t border-b border-slate-100 py-1">
                <div>
                    <span className="block font-bold text-slate-400 text-[6px] uppercase">Fecha Cal</span>
                    <span className="font-bold">{calDate.toLocaleDateString('es-MX')}</span>
                </div>
                <div className="text-right">
                    <span className="block font-bold text-slate-400 text-[6px] uppercase">Vence</span>
                    <span className="font-bold text-red-600">{nextDate.toLocaleDateString('es-MX')}</span>
                </div>
            </div>

            <div className="flex justify-between items-end text-[7px] text-slate-400 uppercase font-bold">
                <div>{data.order_folio}</div>
            </div>
        </div>

        {/* COLUMNA DERECHA: QR */}
        <div className="w-[2.5cm] flex flex-col items-center justify-center border-l border-slate-100 pl-1 pt-2">
            <div className="border-2 border-slate-900 p-1 rounded bg-white">
                <QRCode 
                    value={qrUrl} 
                    size={64} // Tamaño en pixeles
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                />
            </div>
            <span className="text-[6px] text-slate-400 mt-1 font-bold text-center leading-tight">ESCANEAR PARA VERIFICAR</span>
        </div>

      </div>
    </div>
  )
}