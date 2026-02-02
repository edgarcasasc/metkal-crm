'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
    Printer, ArrowLeft, Loader2, Save, AlertCircle, 
    CheckSquare, Square
} from 'lucide-react'

export default function ServiceOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params?.id

  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  const [savingItem, setSavingItem] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const vigenciaOptions = [
      "3 meses", "6 meses", "9 meses", "1 año", "2 años", 
      "30 dias", "60 dias", "90 dias", "180 dias", "365 dias"
  ]
  const recepcionOptions = ["Paquetería", "Personalmente", "Servicio en campo"]

  useEffect(() => {
      if (id) fetchOrderData()
      else setLoading(false)
  }, [id])

  async function fetchOrderData() {
      setLoading(true)
      setErrorMsg(null)
      try {
        // 1. Obtener Orden
        const { data: orderData, error: orderError } = await supabase
            .from('service_orders')
            .select('*')
            .eq('id', id)
            .single()
        
        if (orderError) throw orderError
        if (!orderData) throw new Error("Orden no encontrada")

        // 2. Obtener Cliente y Contacto
        let clientData: any = {}
        let contactData: any = {}

        if (orderData.client_id) {
            const { data: c } = await supabase.from('clients').select('*').eq('id', orderData.client_id).single()
            clientData = c || {}
        }
        
        if (orderData.contact_id) {
            const { data: ct } = await supabase.from('contacts').select('*').eq('id', orderData.contact_id).single()
            contactData = ct || {}
        }

        setOrder({ ...orderData, clients: clientData, contacts: contactData })

        // 3. Obtener Equipos
        // CORRECCIÓN: Usamos 'service_order_items' porque el JSON confirmó que ahí están los datos
        const { data: itemsData, error: itemsError } = await supabase
            .from('service_order_items') 
            .select('*')
            .eq('orden_id', id)
            .order('id', { ascending: true })
        
        if (itemsError) {
            console.error("Error cargando items:", itemsError.message)
            // No lanzamos error fatal aquí para permitir que se vea la orden aunque fallen los items
        }
        
        setItems(itemsData || [])

      } catch (err: any) { 
          console.error("Error general:", err)
          setErrorMsg(err.message)
      } finally { 
          setLoading(false) 
      }
  }

  // --- GENERADOR DE FOLIO ---
  const getCertNumber = (index: number) => {
      if (!order?.folio) return `P-MK-????-${index + 1}/${Math.max(items.length, 1)}`
      const parts = order.folio.split('/')
      let consecutivo = '0000'
      if (parts.length > 1) consecutivo = parts[1]
      else {
          const partsDash = order.folio.split('-')
          if(partsDash.length > 3) consecutivo = partsDash[3]
      }
      return `P-MK-${consecutivo}-${index + 1}/${Math.max(items.length, 1)}`
  }

  const handleUpdateOrder = async () => {
      try {
          const { error } = await supabase.from('service_orders').update({
              metrologo: order.metrologo,
              fecha_programada: order.fecha_programada,
              fecha_estimada: order.fecha_estimada,
              medio_recepcion: order.medio_recepcion,
              comentarios: order.comentarios,
              guia: order.guia,
              entrego: order.entrego,
              recibo: order.recibo
          }).eq('id', id)

          if (error) throw error
          alert("Datos generales guardados correctamente")
      } catch (e: any) { alert("Error: " + e.message) }
  }

  const handleSaveItem = async (item: any) => {
      setSavingItem(item.id)
      try {
          // CORRECCIÓN: También aquí usamos 'service_order_items'
          const { error } = await supabase.from('service_order_items').update({
              vigencia: item.vigencia,
              observaciones: item.observaciones,
              servicio: item.servicio
          }).eq('id', item.id)
          if (error) throw error
      } catch (e: any) { alert("Error: " + e.message) } 
      finally { setSavingItem(null) }
  }

  const handleItemChange = (itemId: number, field: string, value: string) => {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i))
  }

  const handlePrint = () => window.print()

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase gap-2"><Loader2 className="animate-spin"/> Cargando Orden...</div>
  if (errorMsg || !order) return <div className="flex flex-col h-screen items-center justify-center gap-4 text-red-500"><AlertCircle size={48} /><p className="font-bold">Error: {errorMsg}</p><button onClick={() => router.push('/ordenes')} className="bg-slate-800 text-white px-4 py-2 rounded">Volver</button></div>

  return (
    <div className="min-h-screen bg-slate-200 p-8 print:p-0 print:bg-white font-sans text-slate-800">
      <style jsx global>{`@media print { body { visibility: hidden; } #printable-area { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; } .print\\:hidden { display: none !important; } input, select, textarea { border: none !important; appearance: none; padding: 0; margin: 0; background: transparent; } .print\\:border { border: 1px solid #e2e8f0 !important; } }`}</style>

      {/* HEADER */}
      <div className="max-w-[21.5cm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <button onClick={() => router.push('/ordenes')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold uppercase text-xs transition bg-white px-4 py-2 rounded-lg shadow-sm"><ArrowLeft size={16} /> Volver</button>
        <div className="flex gap-2">
            <button onClick={handleUpdateOrder} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-full font-bold uppercase text-xs hover:bg-emerald-700 transition shadow-lg"><Save size={16} /> Guardar Generales</button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-full font-bold uppercase text-xs hover:bg-slate-900 transition shadow-lg"><Printer size={16} /> Imprimir</button>
        </div>
      </div>

      <div id="printable-area" className="max-w-[21.5cm] mx-auto bg-white shadow-2xl print:shadow-none min-h-[27.9cm] p-10 relative text-[10px] leading-tight border border-slate-200">
        
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2 mb-4">
            <div className="w-1/3"><img src="/Logo-Horizontal-Color.png" alt="METKAL" className="h-12 w-auto object-contain mb-2"/></div>
            <div className="text-right"><h1 className="text-xl font-black text-slate-800 uppercase tracking-widest">Orden de Servicio</h1><p className="text-xs font-bold text-slate-500">F7.1-10</p></div>
        </div>

        {/* DATOS GENERALES */}
        <div className="mb-4">
            <h3 className="bg-slate-100 px-2 py-1 font-bold uppercase text-[9px] mb-2 border-l-4 border-slate-800 print:bg-transparent print:border-none print:p-0">Datos Generales:</h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 border border-slate-300 p-2 rounded-sm print:border-slate-300">
                <div className="flex flex-col"><span className="font-bold text-slate-500 text-[8px] uppercase">No. de Servicio</span><span className="font-black text-sm text-red-600 print:text-black">{order.folio}</span></div>
                <div className="flex flex-col"><span className="font-bold text-slate-500 text-[8px] uppercase">Fecha de Recepción</span><span className="font-bold">{order.created_date ? new Date(order.created_date).toLocaleDateString('es-MX') : '-'}</span></div>
                <div className="flex flex-col"><span className="font-bold text-slate-500 text-[8px] uppercase">Registró</span><span className="font-bold uppercase">{order.created_by || 'SISTEMA'}</span></div>
                <div className="flex flex-col mt-2"><span className="font-bold text-slate-500 text-[8px] uppercase">Ingeniero Metrólogo</span><input type="text" value={order.metrologo || ''} onChange={(e) => setOrder({...order, metrologo: e.target.value})} className="border-b border-slate-300 font-bold uppercase w-full bg-slate-50 print:bg-transparent" placeholder="Asignar..."/></div>
                <div className="flex flex-col mt-2"><span className="font-bold text-slate-500 text-[8px] uppercase">Fecha Programada</span><input type="date" value={order.fecha_programada || ''} onChange={(e) => setOrder({...order, fecha_programada: e.target.value})} className="border-b border-slate-300 font-bold w-full bg-slate-50 print:bg-transparent"/></div>
                <div className="flex flex-col mt-2"><span className="font-bold text-slate-500 text-[8px] uppercase">Fecha Estimada Entrega</span><input type="date" value={order.fecha_estimada || ''} onChange={(e) => setOrder({...order, fecha_estimada: e.target.value})} className="border-b border-slate-300 font-bold w-full bg-slate-50 print:bg-transparent"/></div>
            </div>
        </div>

        {/* MEDIO DE RECEPCIÓN */}
        <div className="mb-4">
            <h3 className="bg-slate-100 px-2 py-1 font-bold uppercase text-[9px] mb-2 border-l-4 border-slate-800 print:bg-transparent print:border-none print:p-0">Medio de Recepción:</h3>
            <div className="border border-slate-300 p-2 rounded-sm print:border-slate-300 space-y-3">
                <div className="flex flex-wrap gap-6">
                    {recepcionOptions.map(option => (
                        <label key={option} className="flex items-center gap-1 cursor-pointer">
                            <div onClick={() => setOrder({...order, medio_recepcion: option})} className="print:hidden">{order.medio_recepcion === option ? <CheckSquare size={14} className="text-slate-800"/> : <Square size={14} className="text-slate-300"/>}</div>
                            <div className={`hidden print:block w-3 h-3 border border-black ${order.medio_recepcion === option ? 'bg-black' : ''}`}></div>
                            <span className={`uppercase text-[9px] ${order.medio_recepcion === option ? 'font-bold' : ''}`}>{option}</span>
                        </label>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-4 pt-1 border-t border-slate-100">
                    <div className="flex flex-col"><span className="font-bold text-slate-500 text-[8px] uppercase">Guía:</span><input type="text" value={order.guia || ''} onChange={(e) => setOrder({...order, guia: e.target.value})} className="border-b border-slate-300 w-full uppercase font-bold text-[9px] focus:border-blue-500 outline-none bg-transparent" placeholder="No. de Guía"/></div>
                    <div className="flex flex-col"><span className="font-bold text-slate-500 text-[8px] uppercase">Entregó:</span><input type="text" value={order.entrego || ''} onChange={(e) => setOrder({...order, entrego: e.target.value})} className="border-b border-slate-300 w-full uppercase font-bold text-[9px] focus:border-blue-500 outline-none bg-transparent" placeholder="Quien entrega"/></div>
                    <div className="flex flex-col"><span className="font-bold text-slate-500 text-[8px] uppercase">Recibió:</span><input type="text" value={order.recibo || ''} onChange={(e) => setOrder({...order, recibo: e.target.value})} className="border-b border-slate-300 w-full uppercase font-bold text-[9px] focus:border-blue-500 outline-none bg-transparent" placeholder="Quien recibe"/></div>
                </div>
            </div>
        </div>

        {/* CLIENTE Y CERTIFICADO */}
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-slate-300 p-2 rounded-sm print:border-slate-300">
                <h4 className="font-bold uppercase text-[9px] text-blue-800 mb-2 print:text-black">Datos del Cliente:</h4>
                <div className="space-y-1">
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Empresa:</span> <span className="uppercase font-bold">{order.clients?.empresa || 'S/N'}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Contacto:</span> <span className="uppercase">{order.contacts?.nombre || 'S/N'}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Correo:</span> <span className="lowercase">{order.contacts?.correo || '-'}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Teléfono:</span> <span>{order.contacts?.telefono || '-'}</span></div>
                </div>
            </div>
            <div className="border border-slate-300 p-2 rounded-sm print:border-slate-300">
                <h4 className="font-bold uppercase text-[9px] text-blue-800 mb-2 print:text-black">Datos para Certificado:</h4>
                <div className="space-y-1">
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Empresa:</span> <span className="uppercase">{order.clients?.empresa || 'S/N'}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Domicilio:</span> <span className="uppercase">{order.clients?.domicilio || ''}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Estado:</span> <span className="uppercase">{order.clients?.estado || ''}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Contacto:</span> <span className="uppercase">{order.contacts?.nombre || ''}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Correo:</span> <span className="lowercase">{order.contacts?.correo || '-'}</span></div>
                    <div className="flex"><span className="w-14 font-bold text-slate-500">Teléfono:</span> <span>{order.contacts?.telefono || '-'}</span></div>
                </div>
            </div>
        </div>

        {/* TABLA DE EQUIPOS */}
        <div className="mb-4">
            <h3 className="bg-slate-100 px-2 py-1 font-bold uppercase text-[9px] mb-2 border-l-4 border-slate-800 print:bg-transparent print:border-none print:p-0">Datos de Equipos:</h3>
            <table className="w-full border-collapse border border-slate-300 text-[9px] print:border-slate-300">
                <thead>
                    <tr className="bg-slate-100 print:bg-slate-200">
                        <th className="border p-1">No. Certificado</th>
                        <th className="border p-1">Equipo</th>
                        <th className="border p-1">Marca / Modelo</th>
                        <th className="border p-1">Serie / ID</th>
                        <th className="border p-1 w-16">Servicio</th>
                        <th className="border p-1 w-24">Vigencia</th>
                        <th className="border p-1">Observaciones</th>
                        <th className="border p-1 print:hidden w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr><td colSpan={8} className="border p-4 text-center text-slate-400 italic">No hay equipos registrados en esta orden.</td></tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="border p-1 font-mono text-center">{getCertNumber(idx)}</td>
                                <td className="border p-1 uppercase font-bold">{item.equipo}</td>
                                <td className="border p-1 uppercase">{item.marca} <br/> {item.modelo}</td>
                                <td className="border p-1 uppercase">{item.no_serie} <br/> {item.identificacion}</td>
                                <td className="border p-1 text-center uppercase">{item.servicio || 'Laboratorio'}</td>
                                <td className="border p-1">
                                    <select value={item.vigencia || ''} onChange={(e) => handleItemChange(item.id, 'vigencia', e.target.value)} className="w-full bg-transparent font-bold outline-none cursor-pointer">
                                        <option value="">Seleccionar...</option>
                                        {vigenciaOptions.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                </td>
                                <td className="border p-1">
                                    <textarea value={item.observaciones || ''} onChange={(e) => handleItemChange(item.id, 'observaciones', e.target.value)} className="w-full bg-transparent resize-none outline-none h-8"/>
                                </td>
                                <td className="border p-1 text-center print:hidden">
                                    <button onClick={() => handleSaveItem(item)} disabled={savingItem === item.id} className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 transition">
                                        {savingItem === item.id ? <Loader2 className="animate-spin" size={12}/> : <Save size={12}/>}
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* COMENTARIOS */}
        <div className="mb-8">
            <h3 className="font-bold text-[9px] uppercase mb-1">Comentarios:</h3>
            <textarea value={order.comentarios || ''} onChange={(e) => setOrder({...order, comentarios: e.target.value})} className="w-full border border-slate-300 rounded p-2 h-16 text-[9px] bg-slate-50 focus:bg-white resize-none print:border-slate-300 print:bg-transparent"/>
        </div>

        {/* FIRMAS */}
        <div className="flex justify-around items-end mt-12 text-center">
            <div className="flex flex-col items-center w-1/3">
                <div className="h-10 w-full mb-1"></div>
                <div className="border-t border-black w-full pt-1">
                    <p className="font-bold uppercase text-[9px]">{order.metrologo || 'POR ASIGNAR'}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Nombre y Firma del Metrólogo</p>
                </div>
            </div>
            <div className="flex flex-col items-center w-1/3">
                <div className="h-10 w-full mb-1"></div>
                <div className="border-t border-black w-full pt-1">
                    <p className="font-bold uppercase text-[9px]">{order.contacts?.nombre}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Nombre y Firma del Cliente</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}