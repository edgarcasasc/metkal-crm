'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, MapPin, User, FileText, ChevronDown, 
  History, Plus, Edit, Trash2, Copy, Eye, 
  Loader2, Briefcase, Phone, Calendar, ShieldCheck
} from 'lucide-react'

// IMPORTAMOS LOS MODALES
import { EditClientModal } from '@/components/EditClientModal'
import { AddContactModal } from '@/components/AddContactModal'
import { AddQuoteModal } from '@/components/AddQuoteModal'

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [client, setClient] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([]) 
  const [calibrations, setCalibrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Estados UI
  const [visibleQuotes, setVisibleQuotes] = useState(10)
  const [visibleCals, setVisibleCals] = useState(10)
  
  // CONTROL DE MODALES
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactToEdit, setContactToEdit] = useState<any>(null)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)

  useEffect(() => { 
    if (id) fetchData() 
  }, [id])

  async function fetchData() {
    if (!id) return; 
    const clientIdNum = Number(id);

    if (isNaN(clientIdNum)) {
        setLoading(false);
        setErrorMsg("ID de cliente inválido. Verifique la URL.");
        return;
    }

    try {
        setLoading(true);

        // 1. Cliente
        const { data: clientData, error: clientError } = await supabase.from('clients').select('*').eq('id', clientIdNum).single()
        if (clientError) throw new Error("No se encontró el cliente o hubo un error de conexión.")

        // 2. Contactos
        const { data: contactsData } = await supabase.from('contacts').select('*').eq('client_id', clientIdNum).order('id', { ascending: true })
        
        // 3. Calibraciones
        const { data: calibData } = await supabase.from('calibraciones').select('*').eq('cliente_id', clientIdNum).order('id', { ascending: false });

        setClient(clientData);
        setContacts(contactsData || []);
        setCalibrations(calibData || []);

        // 4. Cotizaciones
        const { data: quotesRaw, error: quotesError } = await supabase
            .from('quotes')
            .select('*')
            .eq('client_id', clientIdNum)
            .order('id', { ascending: false });

        if (quotesError) throw new Error(quotesError.message);

        let quotesWithItems: any[] = [];
        if (quotesRaw && quotesRaw.length > 0) {
            const quoteIds = quotesRaw.map(q => q.id);
            const { data: itemsRaw } = await supabase.from('quote_items').select('*').in('cotizacion_id', quoteIds);
            
            quotesWithItems = quotesRaw.map(q => ({
                ...q,
                items: itemsRaw?.filter(i => i.cotizacion_id === q.id) || []
            }));
        }
        setQuotes(quotesWithItems);
        setErrorMsg(null); 

    } catch (error: any) {
        console.error("Error fetching data:", error); 
        setErrorMsg(error.message); 
    } finally {
        setLoading(false);
    }
  }

  // --- LÓGICA DE CONTACTOS ---
  const handleOpenNewContact = () => { setContactToEdit(null); setIsContactModalOpen(true) }
  const handleEditContact = (contact: any) => { setContactToEdit(contact); setIsContactModalOpen(true) }

  const handleDeleteContact = async (contactId: number) => {
      if (!confirm("¿Estás seguro de eliminar este contacto?")) return
      try {
          const { error } = await supabase.from('contacts').delete().eq('id', contactId)
          if (error) throw error
          setContacts(prev => prev.filter(c => c.id !== contactId))
      } catch (e: any) { alert("Error al eliminar: " + e.message) }
  }

  const handleSaveContact = (savedContact: any) => {
      const exists = contacts.find(c => c.id === savedContact.id)
      if (exists) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c))
      } else {
          setContacts(prev => [...prev, savedContact])
      }
  }

  // --- ACCIONES DE COTIZACIÓN ---
  const handleQuoteAction = async (action: string, doc: any) => {
    if (action === 'Ver') {
        router.push(`/asesor/cotizacion/${doc.id}`)
    } else if (action === 'Subcontrato') {
        try {
            const { data: existingSub } = await supabase.from('subcontract_services').select('id').eq('cotizacion_origen_id', doc.id).maybeSingle();
            if (existingSub) { router.push(`/asesor/servicios-subcontratados/${existingSub.id}`); return; }
            if(!confirm(`¿Generar formato de Servicios Subcontratados para el folio ${doc.folio}?`)) return;
            const { data: newSub, error } = await supabase.from('subcontract_services').insert({
                client_id: doc.client_id, contact_id: doc.contact_id, folio: doc.folio, cotizacion_origen_id: doc.id,
                moneda: doc.moneda, lab: doc.lab
            }).select().single();
            if (error) throw error;
            router.push(`/asesor/servicios-subcontratados/${newSub.id}`)
        } catch (e: any) { alert("Error: " + e.message) }
    } else if (action === 'Duplicar') {
        if(!confirm("¿Duplicar esta cotización?")) return;
        alert("Función duplicar en construcción")
    } else if (action === 'Eliminar') {
        if(!confirm("¿Eliminar cotización permanentemente?")) return;
        await supabase.from('quote_items').delete().eq('cotizacion_id', doc.id);
        await supabase.from('quotes').delete().eq('id', doc.id);
        fetchData();
    }
  }

  const handleOpenNewQuote = () => setIsQuoteModalOpen(true);

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase gap-2"><Loader2 className="animate-spin"/> Cargando expediente...</div>
  
  if (errorMsg) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4">
        <div className="text-red-500 font-bold flex items-center gap-2"><Briefcase size={24}/> {errorMsg}</div>
        <button onClick={() => router.push('/asesor')} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">Volver al Asesor</button>
    </div>
  )

  return (
    // FIX: Padding responsivo
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen font-sans text-slate-600 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none break-words">{client?.empresa}</h1>
          <div className="flex gap-2 mt-2"><span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase tracking-widest">ID: {client?.id}</span></div>
        </div>
        <button onClick={() => router.push('/asesor')} className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-50 transition text-slate-600 shadow-sm"><ArrowLeft size={16} /> VOLVER</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA (Info + Contactos) */}
        <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><MapPin size={14} /> Ubicación Fiscal</h2>
                    <button onClick={() => setIsEditModalOpen(true)} className="text-slate-300 hover:text-blue-600 transition p-1 rounded hover:bg-slate-50"><Edit size={14} /></button>
                </div>
                <p className="text-sm text-slate-800 font-bold uppercase">{client?.domicilio}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase">{client?.municipio}, {client?.estado}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><User size={14} /> Contactos</h2>
                    <button onClick={handleOpenNewContact} className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition border border-blue-100"><Plus size={12} /> Nuevo</button>
                </div>
                <div className="space-y-3">
                    {contacts.map(c => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center group hover:bg-blue-50/50 transition-colors">
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1 truncate">{c.nombre}</p>
                                <p className="text-[10px] text-slate-500 truncate">{c.correo}</p>
                                {c.telefono && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <Phone size={12} className="text-blue-500"/>
                                        <p className="text-sm font-black text-blue-600 tracking-wide">{c.telefono}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button onClick={() => handleEditContact(c)} className="p-1.5 hover:bg-white text-slate-400 hover:text-blue-600 rounded shadow-sm border border-transparent hover:border-slate-100"><Edit size={14}/></button>
                                <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 hover:bg-white text-slate-400 hover:text-red-600 rounded shadow-sm border border-transparent hover:border-slate-100"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                    {contacts.length === 0 && <p className="text-center text-[10px] text-slate-300 italic py-2">Sin contactos registrados.</p>}
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA (Cotizaciones + Certificados) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ACORDEON COTIZACIONES (DISEÑO HÍBRIDO) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileText size={18} /></div>
                  <div>
                      <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight">Cotizaciones</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{quotes.length} Registros</p>
                  </div>
              </div>
              <button onClick={() => setIsQuoteModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-lg"><Plus size={16} /> NUEVA</button>
            </div>
            
            {/* Header Desktop (Grid) - Oculto en móvil */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <div className="col-span-1"></div><div className="col-span-3">Folio</div><div className="col-span-2">Fecha</div><div className="col-span-2">Estatus</div><div className="col-span-2">Asesor</div><div className="col-span-2 text-center">Acciones</div>
            </div>

            <div className="divide-y divide-slate-100">
              {quotes.slice(0, visibleQuotes).map(q => (
                <details key={q.id} className="group">
                  <summary className="cursor-pointer hover:bg-blue-50/20 transition-colors list-none">
                    
                    {/* VISTA ESCRITORIO (GRID 12) */}
                    <div className="hidden md:grid grid-cols-12 gap-2 items-center px-6 py-3">
                        <div className="col-span-1 flex justify-center"><ChevronDown size={16} className="text-slate-300 group-open:text-blue-600 group-open:rotate-180 transition-all" /></div>
                        <div className="col-span-3 font-bold text-blue-700 text-xs">{q.folio}</div>
                        <div className="col-span-2 font-mono text-[10px] text-slate-500">{q.fecha ? new Date(q.fecha).toLocaleDateString('es-MX') : '-'}</div>
                        <div className="col-span-2"><span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black ${q.estatus === 'Aprobada' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{q.estatus || 'Borrador'}</span></div>
                        <div className="col-span-2 text-[10px] font-bold text-slate-600 uppercase truncate">{q.created_by || 'Sistema'}</div>
                        <div className="col-span-2 flex justify-end gap-1" onClick={(e) => e.preventDefault()}>
                            <button onClick={() => handleQuoteAction('Duplicar', q)} title="Duplicar" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition"><Copy size={12}/></button>
                            <button onClick={() => handleQuoteAction('Subcontrato', q)} title="Servicios Subcontratados" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-purple-600 transition"><Briefcase size={12}/></button>
                            <button onClick={() => handleQuoteAction('Ver', q)} title="Ver / Editar" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition"><Eye size={12}/></button>
                            <button onClick={() => handleQuoteAction('Eliminar', q)} title="Eliminar" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition"><Trash2 size={12}/></button>
                        </div>
                    </div>

                    {/* VISTA MÓVIL (STACKED) */}
                    <div className="md:hidden px-4 py-3 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <ChevronDown size={16} className="text-slate-300 group-open:text-blue-600 group-open:rotate-180 transition-all" />
                             <div>
                                 <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-700 text-sm">{q.folio}</span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black ${q.estatus === 'Aprobada' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{q.estatus || 'Borrador'}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-400 font-mono mt-0.5">{q.fecha ? new Date(q.fecha).toLocaleDateString('es-MX') : '-'}</p>
                             </div>
                         </div>
                         <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                            <button onClick={() => handleQuoteAction('Ver', q)} className="p-2 bg-slate-50 rounded-lg text-slate-600"><Eye size={16}/></button>
                         </div>
                    </div>
                  </summary>

                  {/* Detalle Desplegable (Igual para ambos) */}
                  <div className="px-4 md:px-14 pb-4 bg-blue-50/10">
                     <div className="text-[10px] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                        {/* Botones extra para móvil dentro del desplegable */}
                        <div className="md:hidden grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-slate-100">
                             <button onClick={() => handleQuoteAction('Ver', q)} className="flex flex-col items-center p-2 bg-slate-50 rounded text-slate-600 font-bold text-[9px] uppercase"><Eye size={14}/> Ver</button>
                             <button onClick={() => handleQuoteAction('Subcontrato', q)} className="flex flex-col items-center p-2 bg-slate-50 rounded text-purple-600 font-bold text-[9px] uppercase"><Briefcase size={14}/> Subcon</button>
                             <button onClick={() => handleQuoteAction('Eliminar', q)} className="flex flex-col items-center p-2 bg-slate-50 rounded text-red-600 font-bold text-[9px] uppercase"><Trash2 size={14}/> Borrar</button>
                        </div>

                        <table className="w-full text-left">
                            <thead className="text-slate-400 font-bold uppercase border-b border-slate-100"><tr><th className="py-1">Cant</th><th className="py-1">Descripción</th><th className="py-1 text-right">P. Unit</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {q.items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="py-1.5 font-bold">{item.cantidad}</td>
                                    <td className="py-1.5 uppercase font-bold text-slate-800">{item.equipo}</td>
                                    <td className="py-1.5 text-right font-mono">${(Number(item.precio_unitario)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                </tr>))}
                            </tbody>
                        </table>
                     </div>
                  </div>
                </details>
              ))}
            </div>
            {quotes.length > visibleQuotes && <button onClick={() => setVisibleQuotes(prev => prev + 10)} className="w-full py-2 text-[10px] font-bold text-blue-500 bg-slate-50 hover:bg-blue-50 uppercase">Ver más...</button>}
          </div>

          {/* ACORDEON CERTIFICADOS (HÍBRIDO: TABLA vs TARJETAS) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-3">
                 <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><History size={18} /></div>
                 <div>
                    <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight">Certificados</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{calibrations.length} Documentos</p>
                 </div>
              </div>
            </div>
            
            {/* VISTA ESCRITORIO (TABLA) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                  <tr><th className="px-6 py-3">Marca</th><th className="px-6 py-3">Instrumento</th><th className="px-6 py-3 text-center">Fecha Cal</th><th className="px-6 py-3">Modelo</th><th className="px-6 py-3 text-right">Vigencia</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calibrations.slice(0, visibleCals).map((cal) => (
                    <tr key={cal.id} className="hover:bg-emerald-50/10 transition-colors text-slate-600">
                      <td className="px-6 py-3 font-bold uppercase text-slate-700">{cal.marca}</td>
                      <td className="px-6 py-3 uppercase">{cal.instrumento}</td>
                      <td className="px-6 py-3 text-center font-mono text-slate-500">{cal.fecha_calibracion && cal.fecha_calibracion !== '0000-00-00' ? cal.fecha_calibracion : '-'}</td>
                      <td className="px-6 py-3 uppercase text-slate-500">{cal.modelo || 'S/M'}</td>
                      <td className="px-6 py-3 text-right"><span className={`px-2 py-1 rounded font-bold ${cal.fecha_vigencia && cal.fecha_vigencia !== '0000-00-00' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{cal.fecha_vigencia && cal.fecha_vigencia !== '0000-00-00' ? cal.fecha_vigencia : 'N/A'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISTA MÓVIL (TARJETAS COMPACTAS) */}
            <div className="md:hidden p-4 grid gap-3">
                {calibrations.slice(0, visibleCals).map((cal) => (
                    <div key={cal.id} className="bg-white border border-slate-200 rounded-lg p-3 relative overflow-hidden shadow-sm">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                        <div className="flex justify-between items-start mb-2 pl-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{cal.marca || 'S/Marca'}</p>
                                <p className="text-xs font-black text-slate-800 uppercase">{cal.instrumento}</p>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${cal.fecha_vigencia ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                {cal.fecha_vigencia || 'N/A'}
                            </span>
                        </div>
                        <div className="pl-2 flex justify-between text-[10px] text-slate-500 border-t border-slate-50 pt-2">
                             <span className="flex items-center gap-1"><Calendar size={10}/> Cal: {cal.fecha_calibracion || '-'}</span>
                             <span className="uppercase">Mod: {cal.modelo || '-'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {calibrations.length > visibleCals && <button onClick={() => setVisibleCals(prev => prev + 10)} className="w-full py-2 text-[10px] font-bold text-emerald-600 bg-slate-50 hover:bg-emerald-50 uppercase">Ver más certificados...</button>}
          </div>

        </div>
      </div>
      
      {/* MODALES INTEGRADOS */}
      <EditClientModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        clientData={client} 
        onSave={(updated) => setClient({...client, ...updated})} 
      />

      <AddContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        clientId={client?.id}
        contactToEdit={contactToEdit}
        onSave={handleSaveContact}
      />

      <AddQuoteModal 
        isOpen={isQuoteModalOpen} 
        onClose={() => setIsQuoteModalOpen(false)} 
        clientId={client?.id} 
        contacts={contacts} 
        onSave={() => fetchData()} 
      />
    </div>
  )
}