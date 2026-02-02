'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client' // Asegúrate que esto apunte a tu config
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Plus, 
  Copy, 
  ShoppingCart, 
  Eye, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  FileText 
} from 'lucide-react'

// Definición de Tipos
type Client = { id: string; name: string; address: string | null; city: string | null; state: string | null }
type Contact = { id: string; name: string; phone: string | null; email: string | null }
// Ajusta los nombres de columnas según tu base de datos real en Supabase
type Quote = { id: string; quote_number: number; created_at: string; status: string; total: number; origin: string }
type HistoryItem = { id: string; brand: string; model: string; instrument: string; calibration_date: string; expiration_date: string }

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  // Estados
  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Carga de datos
  useEffect(() => {
    async function fetchData() {
      if (!id) return

      try {
        // 1. Cliente
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single()
        
        if (clientError) throw clientError
        setClient(clientData)

        // 2. Contactos (Si la tabla existe)
        const { data: contactsData } = await supabase
          .from('contacts') // Asegúrate que la tabla se llame así en Supabase
          .select('*')
          .eq('client_id', id)
        setContacts(contactsData || [])

        // 3. Cotizaciones (Si la tabla existe)
        const { data: quotesData } = await supabase
          .from('quotes') // Asegúrate que la tabla se llame así
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false })
        setQuotes(quotesData || [])

        // 4. Historial (Si la tabla existe)
        const { data: historyData } = await supabase
          .from('calibration_history') // Asegúrate que la tabla se llame así
          .select('*')
          .eq('client_id', id)
          .limit(10)
        setHistory(historyData || [])

      } catch (error) {
        console.error("Error cargando datos:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, supabase])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64 text-gray-500">
        <span className="animate-pulse">Cargando información del cliente...</span>
      </div>
    )
  }

  if (!client) {
    return <div className="p-8 text-red-500">Cliente no encontrado o eliminado.</div>
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans text-gray-800 space-y-6">
      
      {/* --- ENCABEZADO --- */}
      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{client.name}</h1>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition shadow-sm text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Regresar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- COLUMNA IZQUIERDA --- */}
        <div className="space-y-6">
          
          {/* MÓDULO DOMICILIO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <MapPin size={18} className="text-blue-600" />
                Domicilio
              </h2>
              <button className="text-gray-400 hover:text-blue-600 transition p-1 rounded-md hover:bg-blue-50">
                <Pencil size={18} />
              </button>
            </div>
            <p className="text-gray-600 leading-relaxed uppercase pl-1">
              {client.address || 'SIN CALLE'}, {client.city || 'SIN MUNICIPIO'}, {client.state || ''}
            </p>
          </div>

          {/* MÓDULO CONTACTOS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <User size={18} className="text-blue-600" />
                Contactos
              </h2>
              <button className="bg-slate-900 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition uppercase tracking-wide">
                <Plus size={14} /> Nuevo
              </button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No hay contactos registrados</p>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition mb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900 text-base">{contact.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{contact.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        <span className="truncate max-w-[200px]">{contact.email || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded shadow-sm transition"><Pencil size={14} /></button>
                      <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded shadow-sm transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- COLUMNA DERECHA: COTIZACIONES --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
              <FileText size={18} className="text-blue-600" />
              Cotizaciones
            </h2>
            <button className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition uppercase tracking-wide">
              <Plus size={14} /> Nueva
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
                <tr>
                  <th className="px-3 py-3 font-semibold">Folio</th>
                  <th className="px-3 py-3 font-semibold">Fecha</th>
                  <th className="px-3 py-3 font-semibold">Estatus</th>
                  <th className="px-3 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-gray-400">Sin cotizaciones</td></tr>
                ) : (
                  quotes.map(quote => (
                    <tr key={quote.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-3 py-3 font-medium text-gray-900">MET-{quote.quote_number}</td>
                      <td className="px-3 py-3 text-gray-500">{new Date(quote.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border ${
                          quote.status === 'APROBADA' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded"><Eye size={16} /></button>
                          <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"><ShoppingCart size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MÓDULO INFERIOR: HISTORIAL --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Historial de Calibraciones</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold">Marca / Modelo</th>
                <th className="px-6 py-3 font-semibold">Instrumento</th>
                <th className="px-6 py-3 font-semibold">Fecha Calibración</th>
                <th className="px-6 py-3 font-semibold">Vigencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay historial disponible</td></tr>
              ) : (
                history.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{item.brand}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.model}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{item.instrument}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(item.calibration_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {new Date(item.expiration_date).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}