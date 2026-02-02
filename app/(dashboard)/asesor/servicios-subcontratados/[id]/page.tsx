'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
    Printer, ArrowLeft, Loader2, Package, Save, Trash2, AlertCircle 
} from 'lucide-react'

// IMPORTAMOS EL COMPONENTE REUTILIZABLE (Que ya tiene los 6000 productos y todos los inputs)
import { AddProductModal } from '@/components/AddProductModal'

export default function SubcontractPrintPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [data, setData] = useState<any>(null)
  const [items, setItems] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Solo necesitamos saber si el modal está abierto o cerrado
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

  useEffect(() => { fetchServiceData() }, [id])

  async function fetchServiceData() {
      if (!id) return
      try {
        // 1. Cargar el Servicio Subcontratado
        const { data: service, error: serviceError } = await supabase.from('subcontract_services').select('*').eq('id', id).single()
        if (serviceError) throw serviceError
        
        // 2. Cargar Cliente y Contacto
        const { data: client } = await supabase.from('clients').select('*').eq('id', service.client_id).single()
        let contact = null
        if (service.contact_id) {
            const { data: cData } = await supabase.from('contacts').select('*').eq('id', service.contact_id).single()
            contact = cData
        }
        setData({ ...service, client, contact })

        // 3. Cargar Items
        const { data: sItems, error: itemsError } = await supabase
            .from('subcontract_items')
            .select('*')
            .eq('subcontract_id', service.id)
            .order('id', { ascending: true })
        
        if (itemsError) throw itemsError
        setItems(sItems || [])

      } catch (err: any) { setErrorMsg(err.message) } finally { setLoading(false) }
  }

  // --- Operaciones (Apuntando a subcontract_items) ---
  const handleAddProduct = async (product: any) => {
      const newItem = {
          subcontract_id: Number(id),
          equipo: product.equipo, 
          marca: product.marca, 
          modelo: product.modelo, 
          no_serie: product.no_serie, 
          identificacion: product.identificacion, 
          acreditado: product.acreditado,
          servicio: 'CALIBRACION',
          categoria: product.categoria, // Dato del catálogo
          cantidad: 1, 
          precio_unitario: product.precio, 
          importe: product.precio
      }
      
      await supabase.from('subcontract_items').insert(newItem)
      fetchServiceData() // Recargar lista
  }

  const handleUpdateQuantity = async (itemId: number, newQty: number, unitPrice: number) => {
      if (newQty < 1) return
      const updatedItems = items.map(item => item.id === itemId ? { ...item, cantidad: newQty, importe: newQty * unitPrice } : item)
      setItems(updatedItems)
      await supabase.from('subcontract_items').update({ cantidad: newQty, importe: newQty * unitPrice }).eq('id', itemId)
  }

  const handleDeleteItem = async (itemId: number) => {
      if (!confirm("¿Eliminar servicio?")) return
      await supabase.from('subcontract_items').delete().eq('id', itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.importe) || 0), 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva
  const handlePrint = () => window.print()

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase gap-2"><Loader2 className="animate-spin"/> Cargando documento...</div>
  if (errorMsg || !data) return <div className="flex h-screen items-center justify-center text-red-500 gap-2"><AlertCircle/> {errorMsg}</div>

  return (
    <div className="min-h-screen bg-slate-200 p-8 print:p-0 print:bg-white font-sans text-slate-800">
      <style jsx global>{`@media print { body { visibility: hidden; } #printable-area { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; } .print\\:hidden { display: none !important; } }`}</style>

      {/* BARRA SUPERIOR (No imprime) */}
      <div className="max-w-[21.5cm] mx-auto mb-6 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-center">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold uppercase text-xs transition bg-white px-4 py-2 rounded-lg shadow-sm">
                <ArrowLeft size={16} /> Volver
            </button>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-full font-bold uppercase text-xs hover:bg-slate-900 transition shadow-lg">
                    <Printer size={16} /> Imprimir PDF
                </button>
            </div>
        </div>
        <div className="flex justify-end">
            <button onClick={() => setIsProductModalOpen(true)} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-purple-700 transition shadow-lg shadow-purple-200">
                <Package size={18} /> Agregar Producto (Subcontratado)
            </button>
        </div>
      </div>

      {/* DOCUMENTO IMPRIMIBLE */}
      <div id="printable-area" className="max-w-[21.5cm] mx-auto bg-white shadow-2xl print:shadow-none min-h-[27.9cm] p-12 relative text-[10px] leading-relaxed">
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b-2 border-slate-800 pb-6 mb-6">
            <div className="w-1/2">
                <div className="mb-3"><img src="/Logo-Horizontal-Color.png" alt="METKAL" className="h-16 w-auto object-contain"/></div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Servicios de Metrología</div>
            </div>
            <div className="text-right">
                <h1 className="text-xl font-black text-slate-800 uppercase tracking-widest">Servicios Subcontratados</h1>
                <div className="mt-3 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 border border-slate-200 px-3 py-1 rounded bg-slate-50">
                        <span className="font-bold text-slate-500">FOLIO ORIGINAL:</span>
                        <span className="font-black text-red-600 text-sm">{data.folio}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-500">FECHA:</span>
                        <span className="font-mono font-bold text-slate-700">{data.fecha ? new Date(data.fecha).toLocaleDateString('es-MX') : 'S/F'}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* DATOS CLIENTE */}
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

        {/* TABLA PARTIDAS */}
        <div className="mb-8 min-h-[300px]">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-y-2 border-slate-800 text-slate-700 font-black uppercase text-[9px]">
                        <th className="py-2 px-2 w-10 text-center">#</th>
                        <th className="py-2 px-2 w-16 text-center">Cant</th>
                        <th className="py-2 px-2 w-24">Catálogo</th>
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
                                <input type="number" value={item.cantidad || 1} min="1" onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value), item.precio_unitario)} className="w-12 text-center bg-transparent outline-none print:w-auto"/>
                            </td>
                            {/* COLUMNA CATÁLOGO */}
                            <td className="py-2 px-2 uppercase text-slate-500 font-mono text-[9px]">{item.categoria || item.modelo || 'S/C'}</td>
                            
                            <td className="py-2 px-2 uppercase">
                                <p className="font-bold text-slate-800">Servicio de {item.servicio || 'Calibración'} de {item.equipo}</p>
                                <p className="text-slate-500 text-[9px]">Marca: {item.marca} - Mod: {item.modelo} - Serie: {item.no_serie || item.identificacion || 'N/A'}</p>
                                {item.acreditado && <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded ml-1 print:bg-transparent print:text-slate-500 print:px-0 print:ml-0">ACREDITADO: {item.acreditado}</span>}
                            </td>
                            
                            <td className="py-2 px-2 text-right font-mono text-slate-600">${(Number(item.precio_unitario) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">${(Number(item.importe) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-center print:hidden"><button onClick={() => handleDeleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></td>
                        </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-slate-400 italic">No hay servicios agregados aún.</td></tr>}
                </tbody>
            </table>
        </div>

        {/* TOTALES */}
        <div className="flex justify-end mb-16">
            <div className="w-56">
                <div className="flex justify-between py-1 px-2 border-b border-slate-200 text-slate-600"><span className="font-bold text-[10px]">SUBTOTAL:</span><span className="font-mono text-slate-800">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between py-1 px-2 border-b border-slate-200 text-slate-600"><span className="font-bold text-[10px]">IVA (16%):</span><span className="font-mono text-slate-800">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between py-2 px-2 bg-slate-800 text-white mt-1 rounded-sm"><span className="font-black uppercase text-[11px]">TOTAL:</span><span className="font-mono font-bold text-lg">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            </div>
        </div>

        {/* FIRMAS (Idénticas a cotización) */}
        <div className="absolute bottom-12 left-12 right-12">
            <div className="grid grid-cols-3 gap-12 text-center">
                <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-white border border-slate-200 mb-2 flex items-center justify-center p-1">
                        <img src="/ERIKAYAZMIN.png" alt="Firma" className="w-full h-full object-contain" />
                    </div>
                    <div className="border-t border-slate-400 w-full pt-2">
                        <p className="font-bold uppercase text-[9px] text-slate-700">SOLICITÓ</p>
                        <p className="text-[8px] text-slate-400 uppercase">{data.created_by || 'METKAL'}</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-white border border-slate-200 mb-2 flex items-center justify-center p-1">
                        <img src="/ERIKAYAZMIN.png" alt="Firma" className="w-full h-full object-contain" />
                    </div>
                    <div className="border-t border-slate-400 w-full pt-2">
                        <p className="font-bold uppercase text-[9px] text-slate-700">AUTORIZÓ SERVICIO</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-white border border-slate-200 mb-2 flex items-center justify-center p-1">
                        <img src="/ERIKAYAZMIN.png" alt="Firma" className="w-full h-full object-contain" />
                    </div>
                    <div className="border-t border-slate-400 w-full pt-2">
                        <p className="font-bold uppercase text-[9px] text-slate-700">RECIBIÓ PROVEEDOR</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* AQUÍ ESTÁ LA MAGIA: Usamos el componente AddProductModal */}
      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        onAddProduct={handleAddProduct} 
      />
    </div>
  )
}