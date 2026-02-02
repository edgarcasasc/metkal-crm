'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
    Printer, ArrowLeft, Loader2, Package, Save, Trash2, AlertCircle, 
    Send, CheckCircle, Lock // Agregamos el icono de Candado
} from 'lucide-react'

// IMPORTAMOS EL COMPONENTE NUEVO
import { AddProductModal } from '@/components/AddProductModal'

export default function QuotePrintPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [data, setData] = useState<any>(null)
  const [items, setItems] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Solo necesitamos saber si el modal está abierto o cerrado
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

  useEffect(() => { fetchQuoteData() }, [id])

  async function fetchQuoteData() {
      if (!id) return
      try {
        const { data: quote, error: quoteError } = await supabase.from('quotes').select('*').eq('id', id).single()
        if (quoteError) throw quoteError
        
        const { data: client } = await supabase.from('clients').select('*').eq('id', quote.client_id).single()
        
        let contact = null
        if (quote.contact_id) {
            const { data: cData } = await supabase.from('contacts').select('*').eq('id', quote.contact_id).single()
            contact = cData
        }
        setData({ ...quote, client, contact })

        const { data: qItems, error: itemsError } = await supabase
            .from('quote_items')
            .select('*')
            .eq('cotizacion_id', quote.id)
            .order('id', { ascending: true })
        
        if (itemsError) throw itemsError
        setItems(qItems || [])

      } catch (err: any) { setErrorMsg(err.message) } finally { setLoading(false) }
  }

  // --- LÓGICA DE ESTATUS Y REDIRECCIÓN ---
  const handleUpdateStatus = async (newStatus: string, confirmMessage: string) => {
      if (!confirm(confirmMessage)) return
      try {
          const { error } = await supabase.from('quotes').update({ estatus: newStatus }).eq('id', id)
          if (error) throw error
          
          setData({ ...data, estatus: newStatus })
          
          if (newStatus === 'En Revisión') {
              alert("¡Listo! La cotización ha sido enviada a revisión.")
          } else if (newStatus === 'Aprobada') {
              alert("¡Excelente! Se ha generado la Orden de Servicio.")
          } else {
              alert(`Estatus actualizado a: ${newStatus}`)
          }

      } catch (error: any) { alert("Error: " + error.message) }
  }

  // --- OPERACIONES CON ITEMS ---
  const handleUpdateQuantity = async (itemId: number, newQty: number, unitPrice: number) => {
      if (newQty < 1) return
      const updatedItems = items.map(item => item.id === itemId ? { ...item, cantidad: newQty, importe: newQty * unitPrice } : item)
      setItems(updatedItems)
      await supabase.from('quote_items').update({ cantidad: newQty, importe: newQty * unitPrice }).eq('id', itemId)
  }

  const handleDeleteItem = async (itemId: number) => {
      if (!confirm("¿Eliminar partida?")) return
      await supabase.from('quote_items').delete().eq('id', itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const handleAddProduct = async (product: any) => {
      const newItem = {
          cotizacion_id: Number(id),
          equipo: product.equipo, 
          marca: product.marca, 
          modelo: product.modelo, 
          no_serie: product.no_serie, 
          identificacion: product.identificacion, 
          acreditado: product.acreditado,
          servicio: 'CALIBRACION', 
          categoria: product.categoria,
          cantidad: 1, 
          precio_unitario: product.precio, 
          importe: product.precio
      }
      await supabase.from('quote_items').insert(newItem)
      fetchQuoteData()
  }

  // Cálculos Totales
  const subtotal = items.reduce((sum, item) => sum + (Number(item.importe) || 0), 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva
  const handlePrint = () => window.print()

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase gap-2"><Loader2 className="animate-spin"/> Cargando documento...</div>
  if (errorMsg || !data) return <div className="flex h-screen items-center justify-center text-red-500 gap-2"><AlertCircle/> {errorMsg}</div>

  // --- VARIABLE PARA SABER SI ESTÁ BLOQUEADA ---
  // Si NO es 'Borrador' (es decir, es 'En Revisión' o 'Aprobada'), consideramos que está bloqueada
  const isReadOnly = data?.estatus && data?.estatus !== 'Borrador';

  return (
    <div className="min-h-screen bg-slate-200 p-8 print:p-0 print:bg-white font-sans text-slate-800">
      <style jsx global>{`@media print { body { visibility: hidden; } #printable-area { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; } .print\\:hidden { display: none !important; } }`}</style>

      <div className="max-w-[21.5cm] mx-auto mb-6 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-center">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold uppercase text-xs transition bg-white px-4 py-2 rounded-lg shadow-sm"><ArrowLeft size={16} /> Volver</button>
            <div className="flex gap-2">
                
                {/* BOTÓN ENVIAR A APROBACIÓN (INTELIGENTE) */}
                <button 
                    onClick={() => handleUpdateStatus('En Revisión', '¿Enviar esta cotización a revisión? El asesor perderá permisos de edición hasta que sea rechazada.')}
                    disabled={isReadOnly} // SE DESACTIVA SI YA NO ES BORRADOR
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-xs transition shadow-lg
                        ${isReadOnly 
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed' // Estilo Desactivado
                            : 'bg-amber-500 text-white hover:bg-amber-600' // Estilo Activo
                        }
                    `}
                >
                    {isReadOnly ? (
                        <><Lock size={16} /> En Revisión</>
                    ) : (
                        <><Send size={16} /> Enviar a Aprobación</>
                    )}
                </button>

                {/* BOTÓN CREAR ORDEN (Solo habilitado si está aprobada o lista) */}
                <button 
                    onClick={() => handleUpdateStatus('Aprobada', '¿Crear Orden de Servicio?')} 
                    // Opcional: También podrías desactivar este si ya está aprobada
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold uppercase text-xs hover:bg-emerald-700 transition shadow-lg"
                >
                    <CheckCircle size={16} /> Crear Orden
                </button>

                <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-full font-bold uppercase text-xs hover:bg-slate-900 transition shadow-lg"><Printer size={16} /> Imprimir</button>
            </div>
        </div>
        <div className="flex justify-end">
            <button 
                onClick={() => setIsProductModalOpen(true)} 
                disabled={isReadOnly} // También bloqueamos agregar productos si está en revisión
                className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs transition shadow-lg
                    ${isReadOnly 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                    }
                `}
            >
                <Package size={18} /> Agregar Producto
            </button>
        </div>
      </div>

      <div id="printable-area" className="max-w-[21.5cm] mx-auto bg-white shadow-2xl print:shadow-none min-h-[27.9cm] p-12 relative text-[10px] leading-relaxed">
        
        <div className="flex justify-between items-end border-b-2 border-slate-800 pb-6 mb-6">
            <div className="w-1/2">
                <div className="mb-3"><img src="/Logo-Horizontal-Color.png" alt="METKAL" className="h-16 w-auto object-contain"/></div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Servicios de Metrología</div>
            </div>
            <div className="text-right">
                <h1 className="text-xl font-black text-slate-800 uppercase tracking-widest">Cotización</h1>
                <div className="mt-3 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 border border-slate-200 px-3 py-1 rounded bg-slate-50"><span className="font-bold text-slate-500">FOLIO:</span><span className="font-black text-red-600 text-sm">{data.folio}</span></div>
                    <div className="flex items-center gap-2"><span className="font-bold text-slate-500">FECHA:</span><span className="font-mono font-bold text-slate-700">{data.fecha ? new Date(data.fecha).toLocaleDateString('es-MX') : 'S/F'}</span></div>
                    <div className="mt-1"><span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase ${data.estatus === 'Aprobada' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Estatus: {data.estatus}</span></div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-8">
            <div>
                <h3 className="bg-slate-800 text-white px-2 py-1 font-bold uppercase text-[9px] mb-3 inline-block tracking-wider">Datos del Cliente:</h3>
                <div className="space-y-1.5 text-[10px]">
                    <div className="flex gap-2"><span className="font-bold w-16 shrink-0 text-slate-600">EMPRESA:</span> <span className="font-bold uppercase">{data.client?.empresa || 'N/A'}</span></div>
                    <div className="flex gap-2"><span className="font-bold w-16 shrink-0 text-slate-600">DIRECCIÓN:</span> <span className="uppercase text-slate-600">{data.client?.domicilio || ''}</span></div>
                    <div className="flex gap-2"><span className="font-bold w-16 shrink-0 text-slate-600">CONTACTO:</span> <span className="uppercase font-bold">{data.contact?.nombre || 'N/A'}</span></div>
                    <div className="flex gap-2"><span className="font-bold w-16 shrink-0 text-slate-600">TELÉFONO:</span> <span className="font-mono text-slate-600">{data.contact?.telefono || 'S/N'}</span></div>
                    <div className="flex gap-2"><span className="font-bold w-16 shrink-0 text-slate-600">CORREO:</span> <span className="lowercase text-slate-600">{data.contact?.correo || 'S/N'}</span></div>
                </div>
            </div>
            <div>
                <h3 className="bg-slate-800 text-white px-2 py-1 font-bold uppercase text-[9px] mb-3 inline-block tracking-wider">Proveedor Externo:</h3>
                <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                    <div><span className="font-bold text-slate-600 block text-[9px]">MONEDA</span> <span className="font-bold">{data.moneda}</span></div>
                    <div><span className="font-bold text-slate-600 block text-[9px]">TIEMPO ENTREGA</span> <span>{data.tiempo_de_entrega} días</span></div>
                    <div><span className="font-bold text-slate-600 block text-[9px]">CONDICIONES PAGO</span> <span>{data.condicion_de_pago} días</span></div>
                    <div><span className="font-bold text-slate-600 block text-[9px]">VIGENCIA</span> <span>{data.vigencia} días</span></div>
                    <div><span className="font-bold text-slate-600 block text-[9px]">L.A.B.</span> <span>{data.lab}</span></div>
                </div>
            </div>
        </div>

        <div className="mb-8 min-h-[300px]">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-y-2 border-slate-800 text-slate-700 font-black uppercase text-[9px]">
                        <th className="py-2 px-2 w-10 text-center">#</th>
                        <th className="py-2 px-2 w-16 text-center">Cant</th>
                        <th className="py-2 px-2 w-24">Catálogo</th>
                        <th className="py-2 px-2 w-16">Id</th>
                        <th className="py-2 px-2 w-20">Servicio</th>
                        <th className="py-2 px-2">Descripción</th>
                        <th className="py-2 px-2 w-28 text-right">P. Unitario</th>
                        <th className="py-2 px-2 w-28 text-right">Importe</th>
                        <th className="py-2 px-2 w-8 print:hidden"></th>
                    </tr>
                </thead>
                <tbody className="text-[10px]">
                    {items.map((item, index) => (
                        <tr key={index} className="border-b border-slate-200 hover:bg-slate-50 transition-colors group">
                            <td className="py-2 px-2 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="py-2 px-2 text-center font-bold">
                                {/* Si está bloqueado, mostramos texto estático, si no, el input */}
                                {isReadOnly ? (
                                    <span>{item.cantidad}</span>
                                ) : (
                                    <input type="number" value={item.cantidad || 1} min="1" onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value), item.precio_unitario)} className="w-12 text-center bg-transparent outline-none print:w-auto"/>
                                )}
                            </td>
                            <td className="py-2 px-2 uppercase text-slate-500 font-mono text-[9px]">{item.categoria || 'S/C'}</td>
                            <td className="py-2 px-2 uppercase text-slate-500 font-mono text-[9px]">{item.identificacion || item.no_serie || '-'}</td>
                            <td className="py-2 px-2 uppercase text-slate-500 font-bold text-[9px]">{item.servicio || 'CALIBRACION'}</td>
                            <td className="py-2 px-2 uppercase">
                                <p className="font-bold text-slate-800">{item.equipo}</p>
                                <p className="text-slate-500 text-[9px]">Marca: {item.marca} - Mod: {item.modelo} - Serie: {item.no_serie || item.identificacion || 'N/A'}</p>
                                {item.acreditado && <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded ml-1 print:bg-transparent print:text-slate-500 print:px-0 print:ml-0">ACREDITADO: {item.acreditado}</span>}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">${(Number(item.precio_unitario) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">${(Number(item.importe) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-center print:hidden">
                                {!isReadOnly && (
                                    <button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="flex justify-end mb-16">
            <div className="w-56">
                <div className="flex justify-between py-1 px-2 border-b border-slate-200 text-slate-600"><span className="font-bold text-[10px]">SUBTOTAL:</span><span className="font-mono text-slate-800">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between py-1 px-2 border-b border-slate-200 text-slate-600"><span className="font-bold text-[10px]">IVA (16%):</span><span className="font-mono text-slate-800">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between py-2 px-2 bg-slate-800 text-white mt-1 rounded-sm"><span className="font-black uppercase text-[11px]">TOTAL:</span><span className="font-mono font-bold text-lg">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <p className="text-[8px] text-right mt-1 text-slate-400 uppercase font-bold">* Los precios mencionados son en M.N.</p>
            </div>
        </div>

        <div className="absolute bottom-12 left-12 right-12">
            <div className="flex justify-center gap-32 text-center">
                <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-white border border-slate-200 mb-2 flex items-center justify-center p-1">
                        <img src="/ERIKAYAZMIN.png" alt="Firma" className="w-full h-full object-contain" />
                    </div>
                    <div className="border-t border-slate-400 w-full pt-2">
                        <p className="font-bold uppercase text-[9px] text-slate-700">ERIKA YAZMIN</p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Ejecutivo de Ventas</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-white border border-slate-200 mb-2 flex items-center justify-center p-1">
                        <img src="/SergioGArza.png" alt="Firma" className="w-full h-full object-contain" />
                    </div>
                    <div className="border-t border-slate-400 w-full pt-2">
                        <p className="font-bold uppercase text-[9px] text-slate-700">Sergio Garza</p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Autorizó</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        onAddProduct={handleAddProduct} 
      />
    </div>
  )
}