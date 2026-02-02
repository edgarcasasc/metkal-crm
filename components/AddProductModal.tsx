'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, Search, Loader2, Check, ChevronDown, ChevronUp, Save, ChevronLeft, ChevronRight } from 'lucide-react'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAddProduct: (product: any) => void
}

export function AddProductModal({ isOpen, onClose, onAddProduct }: AddProductModalProps) {
  const supabase = createClient()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Paginación
  const [itemsPerPage] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  // Estados para el Acordeón de Crear Producto
  const [isAccordionOpen, setIsAccordionOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [newProd, setNewProd] = useState({
    categoria: 'CALIBRACION',
    equipo: '',
    marca: '',
    modelo: '',
    no_serie: 'N/A',
    identificacion: 'N/A',
    acreditado: 'ACREDITADO CON PERRY JOHNSON',
    precio: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
    }
  }, [isOpen, searchTerm, currentPage])

  async function fetchProducts() {
    setLoading(true)
    try {
      let query = supabase.from('products').select('*', { count: 'exact' })
      
      if (searchTerm) {
        query = query.or(`equipo.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%`)
      }
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      const { data, count, error } = await query
        .range(from, to)
        .order('equipo', { ascending: true })
      
      if (error) throw error

      setProducts(data || [])
      setTotalProducts(count || 0)

    } catch (e) {
      console.error("Error al buscar productos:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!newProd.equipo || !newProd.precio) {
        alert("El nombre del equipo y el precio son obligatorios.")
        return
    }
    setIsSavingNew(true)
    try {
        const { data, error } = await supabase.from('products').insert({
            categoria: newProd.categoria,
            equipo: newProd.equipo.toUpperCase(),
            marca: newProd.marca.toUpperCase(),
            modelo: newProd.modelo.toUpperCase(),
            no_serie: newProd.no_serie.toUpperCase(),
            identificacion: newProd.identificacion.toUpperCase(),
            acreditado: newProd.acreditado.toUpperCase(),
            precio: parseFloat(newProd.precio)
        }).select().single()

        if (error) throw error

        onAddProduct(data) 

        setNewProd({ categoria: 'CALIBRACION', equipo: '', marca: '', modelo: '', no_serie: 'N/A', identificacion: 'N/A', acreditado: 'ACREDITADO CON PERRY JOHNSON', precio: '' })
        setIsAccordionOpen(false)
        fetchProducts() 
    } catch (error: any) {
        alert("Error: " + error.message)
    } finally {
        setIsSavingNew(false)
    }
  }

  const totalPages = Math.ceil(totalProducts / itemsPerPage)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 print:hidden">
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white rounded-t-xl">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Search size={20} className="text-blue-600"/> 
            Catálogo de Productos ({totalProducts})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={24} className="text-slate-400" /></button>
        </div>

        {/* Acordeón Crear - AQUI ESTAN LOS INPUTS AGREGADOS */}
        <div className="bg-slate-50 border-b border-slate-200">
            <button onClick={() => setIsAccordionOpen(!isAccordionOpen)} className="w-full flex justify-between items-center p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition">
                <span className="flex items-center gap-2"><Plus size={16} className="text-emerald-600"/> {isAccordionOpen ? 'Cancelar Creación' : 'Crear Nuevo Producto (Si no existe)'}</span>
                {isAccordionOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            
            {isAccordionOpen && (
                <div className="p-5 border-t border-slate-200 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 shadow-inner">
                    
                    {/* Fila 1 */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">CATEGORÍA</label>
                        <select value={newProd.categoria} onChange={e=>setNewProd({...newProd, categoria:e.target.value})} className="w-full border p-2 rounded text-xs bg-slate-50">
                            <option>CALIBRACION</option>
                            <option>VENTA</option>
                            <option>REPARACION</option>
                            <option>RENTA</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">EQUIPO</label>
                        <input type="text" value={newProd.equipo} onChange={e=>setNewProd({...newProd, equipo:e.target.value})} className="w-full border p-2 rounded text-xs" placeholder="Ej. Manómetro Digital"/>
                    </div>
                    
                    {/* Fila 2 */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">MARCA</label>
                        <input type="text" value={newProd.marca} onChange={e=>setNewProd({...newProd, marca:e.target.value})} className="w-full border p-2 rounded text-xs" placeholder="Ej. Fluke"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">MODELO</label>
                        <input type="text" value={newProd.modelo} onChange={e=>setNewProd({...newProd, modelo:e.target.value})} className="w-full border p-2 rounded text-xs" placeholder="Ej. 123-X"/>
                    </div>
                    {/* Campos Faltantes Agregados */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1"># SERIE</label>
                        <input type="text" value={newProd.no_serie} onChange={e=>setNewProd({...newProd, no_serie:e.target.value})} className="w-full border p-2 rounded text-xs" placeholder="N/A"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">IDENTIFICACIÓN</label>
                        <input type="text" value={newProd.identificacion} onChange={e=>setNewProd({...newProd, identificacion:e.target.value})} className="w-full border p-2 rounded text-xs" placeholder="ID Interno"/>
                    </div>

                    {/* Fila 3 */}
                    <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">ACREDITADO</label>
                        <input type="text" value={newProd.acreditado} onChange={e=>setNewProd({...newProd, acreditado:e.target.value})} className="w-full border p-2 rounded text-xs"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">PRECIO</label>
                        <input type="number" value={newProd.precio} onChange={e=>setNewProd({...newProd, precio:e.target.value})} className="w-full border p-2 rounded text-xs font-bold text-blue-700" placeholder="0.00"/>
                    </div>
                    
                    <div className="md:col-span-4 flex justify-end mt-2">
                        <button onClick={handleCreateAndAdd} disabled={isSavingNew} className="bg-slate-800 text-white px-6 py-2 rounded font-bold text-xs flex gap-2 items-center hover:bg-slate-900 shadow-md">
                            {isSavingNew ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} 
                            GUARDAR Y AGREGAR
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Buscador */}
        <div className="p-4 bg-white border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar por equipo, marca o modelo..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border border-slate-300 pl-10 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"/>
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto bg-slate-50/30">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2"><Loader2 className="animate-spin" size={32}/> Cargando productos...</div>
          ) : (
            <table className="w-full text-left text-xs bg-white shadow-sm mx-auto max-w-[98%] mt-4 rounded-lg overflow-hidden border border-slate-100">
              <thead className="bg-slate-100 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Equipo</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Modelo</th>
                  <th className="p-3 text-right">Precio</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <ProductRow key={p.id} product={p} onAdd={onAddProduct} />
                ))}
                {products.length === 0 && !loading && <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No se encontraron productos.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer Paginación */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-xs rounded-b-xl">
            <div className="text-slate-500 font-bold">
                Mostrando {products.length} de {totalProducts} productos
            </div>
            <div className="flex gap-2 items-center">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1 || loading}
                    className="p-2 border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold text-slate-600"
                >
                    <ChevronLeft size={16}/> Anterior
                </button>
                <span className="px-4 py-2 bg-slate-100 rounded font-mono font-bold text-slate-700">
                    Página {currentPage} de {totalPages || 1}
                </span>
                <button 
                    onClick={() => setCurrentPage(prev => (prev < totalPages ? prev + 1 : prev))} 
                    disabled={currentPage >= totalPages || loading}
                    className="p-2 border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold text-slate-600"
                >
                    Siguiente <ChevronRight size={16}/>
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}

function ProductRow({ product, onAdd }: { product: any, onAdd: (p: any) => void }) {
    const [isAdded, setIsAdded] = useState(false);
    const handleClick = () => { onAdd(product); setIsAdded(true); setTimeout(() => setIsAdded(false), 2000); };
    return (
        <tr className="hover:bg-blue-50 transition-colors group">
            <td className="p-3 text-slate-500 font-mono">{product.categoria}</td>
            <td className="p-3 font-bold text-slate-700">{product.equipo}</td>
            <td className="p-3 text-slate-600">{product.marca}</td>
            <td className="p-3 text-slate-500">{product.modelo}</td>
            <td className="p-3 text-right font-mono font-bold text-blue-600">${product.precio}</td>
            <td className="p-3 text-center">
                <button onClick={handleClick} disabled={isAdded} className={`flex items-center justify-center gap-1 mx-auto px-3 py-1.5 rounded shadow-sm transition-all duration-300 transform active:scale-95 ${isAdded ? "bg-slate-800 text-emerald-400 cursor-default" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}>
                    {isAdded ? <><Check size={16} className="animate-bounce" /><span className="font-bold text-[10px]">LISTO</span></> : <><Plus size={16}/><span className="font-bold text-[10px]">AGREGAR</span></>}
                </button>
            </td>
        </tr>
    )
}