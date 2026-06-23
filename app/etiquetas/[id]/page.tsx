'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, Loader2, Download } from 'lucide-react'
import QRCode from "react-qr-code"
import { toPng } from 'html-to-image'

export default function LabelPage() {
  const { id } = useParams()
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const labelRef = useRef<HTMLDivElement>(null)

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
      
      // Parsear número de orden para el certificado
      const { data: order } = await supabase.from('service_orders').select('folio').eq('id', item.orden_id).single()
      
      let certNumber = item.certificado;
      if (!certNumber && order?.folio) {
          const numMatch = order.folio.match(/\d+$/);
          const orderNum = numMatch ? numMatch[0] : '0000';
          certNumber = `C-${orderNum}-${item.id}`;
      }

      setData({ ...item, result, certNumber })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadImage = async () => {
      if (!labelRef.current) return;
      try {
          // Remover la línea punteada temporalmente para la imagen
          const originalBorder = labelRef.current.style.border;
          labelRef.current.style.border = 'none';

          const dataUrl = await toPng(labelRef.current, { 
              quality: 1, 
              pixelRatio: 4, 
              backgroundColor: '#ffffff' 
          });

          const link = document.createElement('a');
          link.download = `Etiqueta_${data.identificacion || 'Metkal'}.png`;
          link.href = dataUrl;
          link.click();

          // Restaurar borde
          labelRef.current.style.border = originalBorder;
      } catch (err) {
          console.error("Error al generar imagen:", err);
          alert("Hubo un error al generar la imagen. Intenta de nuevo.");
      }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>
  if (!data) return <div className="text-center p-10 font-bold text-red-500">No se encontró el equipo</div>

  const calDate = data.result?.fecha_calibracion ? new Date(data.result.fecha_calibracion) : new Date()
  const nextDate = new Date(calDate)
  nextDate.setFullYear(nextDate.getFullYear() + 1)
  
  // Format Date to YYYY-MM-DD
  const formatDate = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
  }

  return (
    <div className="min-h-screen bg-slate-200 p-8 flex flex-col items-center justify-center font-sans text-slate-900">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
        @page { size: auto; margin: 0mm; }
        @media print {
          body { background: white; padding: 2mm; }
          .no-print { display: none !important; }
          .print-label { 
              box-shadow: none !important; 
              border: 1px dashed #cbd5e1 !important; /* Línea de corte gris claro */
              margin: 2mm; /* Pequeño margen para ver la línea de corte */
          }
        }
      `}</style>

      <div className="no-print mb-8 flex gap-4">
        <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition">
            <Printer size={16}/> Imprimir PDF / Térmica
        </button>
        <button onClick={handleDownloadImage} className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition">
            <Download size={16}/> Descargar PNG
        </button>
      </div>

      {/* ETIQUETA PREMIUM 10x5 cm aprox */}
      <div ref={labelRef} className="print-label bg-white w-[10cm] h-[5cm] border border-slate-300 shadow-2xl flex overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
        
        {/* Lado Izquierdo: Info */}
        <div className="flex-1 flex flex-col p-2 justify-between">
            
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1 text-slate-900">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <span className="font-black tracking-tight text-[15px] uppercase">Metkal</span>
                </div>
                <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">
                    CALIBRADO
                </div>
            </div>

            {/* Main Data */}
            <div className="flex flex-col gap-1 mt-2">
                <div className="flex justify-between items-end border-b border-slate-200 pb-1">
                    <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">ID EQUIPO</span>
                    <span className="font-black text-[15px] text-slate-900 leading-none">{data.identificacion || 'S/N'}</span>
                </div>
                
                <div className="flex justify-between items-end border-b border-slate-200 pb-1">
                    <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">CERTIFICADO</span>
                    <span className="font-bold text-[10px] text-slate-800 leading-none">{data.certNumber}</span>
                </div>

                <div className="flex justify-between mt-1">
                    <div>
                        <span className="block text-[6px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">FECHA CAL.</span>
                        <span className="font-bold text-[9px] text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{formatDate(calDate)}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[6px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">VIGENCIA</span>
                        <span className="font-bold text-[9px] text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{formatDate(nextDate)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-[5px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                METROLOGÍA DE ALTA PRECISIÓN / MK-ET-01
            </div>

        </div>

        {/* Lado Derecho: Código QR en bloque negro */}
        <div className="w-[3cm] bg-slate-900 flex flex-col items-center justify-center p-2 relative">
            <div className="bg-white p-1 rounded-sm shadow-inner w-[2cm] h-[2cm] flex items-center justify-center">
                <QRCode 
                    value={qrUrl} 
                    size={64} // Tamaño en pixeles
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                />
            </div>
            <div className="mt-2 text-center">
                <span className="block text-white text-[7px] font-bold tracking-widest leading-tight">ESCANEAR</span>
                <span className="block text-slate-400 text-[5px] font-bold tracking-widest">PARA VERIFICAR</span>
            </div>
            
            {/* Pequeño detalle de diseño */}
            <div className="absolute top-0 right-0 w-4 h-4 bg-white opacity-10 rounded-bl-full"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 bg-white opacity-10 rounded-tr-full"></div>
        </div>

      </div>
    </div>
  )
}