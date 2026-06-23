'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client' 
import PressureCalibrationForm from "@/components/metrology/pressure/PressureCalibrationForm";
import TemperatureCalibrationForm from "@/components/metrology/temperature/TemperatureCalibrationForm";
import DimensionalCalibrationForm from "@/components/metrology/dimensional/DimensionalCalibrationForm";
import ElectricalCalibrationForm from "@/components/metrology/electrical/ElectricalCalibrationForm";
import HardnessCalibrationForm from "@/components/metrology/hardness/HardnessCalibrationForm";
import TimeCalibrationForm from "@/components/metrology/time/TimeCalibrationForm";
import OpticsCalibrationForm from "@/components/metrology/optics/OpticsCalibrationForm";
import ChemistryCalibrationForm from "@/components/metrology/chemistry/ChemistryCalibrationForm";
import TorqueCalibrationForm from "@/components/metrology/torque/TorqueCalibrationForm";
import VolumeCalibrationForm from "@/components/metrology/volume/VolumeCalibrationForm";
import MassCalibrationForm from "@/components/metrology/mass/MassCalibrationForm";
import GenericCalibrationForm from "@/components/metrology/generic/GenericCalibrationForm";
import { 
    ArrowLeft, Loader2, Wrench, FileText, Save,
    AlertCircle, Thermometer, Gauge, ChevronRight,
    Printer, Ruler, CheckCircle2, Truck, User, Calendar as CalendarIcon, MapPin, Zap
} from 'lucide-react'

interface ServiceItem {
    id: number; equipo: string; marca: string; modelo: string; no_serie: string;
    identificacion: string; servicio: string; estatus_tecnico?: string; magnitud?: string;
}

export default function Page({ params }: { params: { id: string } }) {
    const { id } = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [order, setOrder] = useState<any>(null)
    const [items, setItems] = useState<ServiceItem[]>([]) 
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [finishing, setFinishing] = useState(false) // Nuevo estado para finalizar
    const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null)
    const repairAttempted = useRef(false)

    useEffect(() => { if (id) fetchWorkOrder() }, [id])

    // --- FUNCIONES LÓGICAS ---
    async function fetchWorkOrder() {
        setLoading(true)
        try {
            const { data: orderData, error: orderError } = await supabase.from('service_orders').select('*').eq('id', id).single()
            if (orderError) throw orderError
            let clientData = {}, contactData = {}
            if (orderData.client_id) { const { data: c } = await supabase.from('clients').select('*').eq('id', orderData.client_id).single(); clientData = c || {} }
            if (orderData.contact_id){ const { data: c } = await supabase.from('contacts').select('*').eq('id', orderData.contact_id).single(); contactData = c || {} }
            setOrder({ ...orderData, client: clientData, contact: contactData })

            let { data: itemsData, error: itemsError } = await supabase.from('service_order_items').select('*').eq('orden_id', id).order('id', { ascending: true })
            if (itemsError) throw itemsError

            if ((!itemsData || itemsData.length === 0) && orderData.cotizacion_id && !repairAttempted.current) {
                repairAttempted.current = true;
                const { data: quoteItems } = await supabase.from('quote_items').select('*').eq('cotizacion_id', orderData.cotizacion_id)
                if (quoteItems && quoteItems.length > 0) {
                    const newItems = quoteItems.map(qi => ({ orden_id: Number(id), equipo: qi.equipo, marca: qi.marca, modelo: qi.modelo, no_serie: qi.no_serie, identificacion: qi.identificacion, servicio: qi.servicio || 'CALIBRACION', magnitud: qi.categoria, estatus_tecnico: 'Pendiente' }))
                    const { error: insertError } = await supabase.from('service_order_items').insert(newItems)
                    if (!insertError) {
                        const { data: refreshedItems } = await supabase.from('service_order_items').select('*').eq('orden_id', id).order('id', { ascending: true })
                        itemsData = refreshedItems
                    }
                }
            }
            setItems(itemsData || [])
        } catch (e: any) { console.error("Error:", e.message) } finally { setLoading(false) }
    }

    const handleSaveOrder = async () => {
        setSaving(true)
        try {
            const { error: orderErr } = await supabase.from('service_orders').update({ metrologo: order.metrologo, fecha_programada: order.fecha_programada, fecha_estimada: order.fecha_estimada, medio_recepcion: order.medio_recepcion, guia: order.guia, entrego: order.entrego, recibio: order.recibio, comentarios: order.comentarios }).eq('id', id)
            if (orderErr) throw orderErr
            for (const item of items) { if(item.magnitud) { await supabase.from('service_order_items').update({ magnitud: item.magnitud }).eq('id', item.id) } }
            alert("✅ Orden actualizada correctamente")
        } catch (e: any) { alert("Error al guardar: " + e.message) } finally { setSaving(false) }
    }

    // --- NUEVA FUNCIÓN: FINALIZAR ORDEN ---
    const handleFinalizeOrder = async () => {
        // Validación de ítems completos
        const incomplete = items.some(i => i.estatus_tecnico !== 'Terminado')
        
        if (incomplete) {
            if (!confirm("⚠️ Aún hay equipos pendientes de calibrar. ¿Seguro que quieres finalizar la orden?")) return
        } else {
            if (!confirm("¿Confirmar entrega y cierre de orden? Pasará al Historial.")) return
        }

        setFinishing(true)
        try {
            const { error } = await supabase
                .from('service_orders')
                .update({ 
                    estatus: 'Terminado',
                    fecha_entrega: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error
            
            alert("🏆 Orden Finalizada y Archivada.")
            router.push('/metrologia') // Volver al tablero

        } catch (e: any) {
            alert("Error: " + e.message)
        } finally {
            setFinishing(false)
        }
    }

    const updateOrderField = (field: string, value: any) => { setOrder((prev: any) => ({ ...prev, [field]: value })) }
    const updateItemMagnitude = (itemId: number, mag: string) => { setItems(prev => prev.map(i => i.id === itemId ? { ...i, magnitud: mag } : i)) }
    const safeDate = (dateStr: string) => { if (!dateStr) return 'S/F'; try { const date = new Date(dateStr); const userTimezoneOffset = date.getTimezoneOffset() * 60000; const adjustedDate = new Date(date.getTime() + userTimezoneOffset); return adjustedDate.toLocaleDateString('es-MX', {day: '2-digit', month: 'long', year: 'numeric'}) } catch (e) { return 'Fecha Inválida' } }

    if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase gap-2"><Loader2 className="animate-spin"/> Cargando Orden...</div>

    // --- CÁLCULO DE PROGRESO ---
    const totalItems = items.length
    const completedItems = items.filter(i => i.estatus_tecnico === 'Terminado').length
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    const isOrderComplete = totalItems > 0 && completedItems === totalItems

    // --- VISTA DE CALIBRACIÓN ---
    if (selectedItem) {
        // Definir variables PRIMERO para evitar ReferenceError
        const equipoNombre = (selectedItem.equipo || '').toLowerCase();
        const magnitud = (selectedItem.magnitud || '').toLowerCase();

        // Lógica de detección: La magnitud seleccionada explícitamente tiene prioridad absoluta
        let esDimensional = magnitud === 'dimensional';
        let esPresion = magnitud === 'presion' || magnitud === 'presión';
        let esTemperatura = magnitud === 'temperatura';
        let esElectrica = magnitud === 'eléctrica' || magnitud === 'electrica';
        let esDureza = magnitud === 'dureza';
        let esTiempo = magnitud === 'tiempo';
        let esFrecuencia = magnitud === 'frecuencia';
        let esOptica = magnitud === 'óptica' || magnitud === 'optica';
        let esQuimica = magnitud === 'química' || magnitud === 'quimica';
        let esTorque = magnitud === 'torque' || magnitud === 'par torsional';
        let esVolumen = magnitud === 'volumen' || magnitud === 'volúmen';
        let esMasa = magnitud === 'masa' || magnitud === 'balanza' || magnitud === 'bascula';
        
        // Si no hay magnitud explícita, intentamos adivinar por el nombre
        if (!esDimensional && !esPresion && !esTemperatura && !esElectrica && !esDureza && !esTiempo && !esFrecuencia && !esOptica && !esQuimica && !esTorque && !esVolumen && !esMasa) {
            esDimensional = equipoNombre.includes('vernier') || equipoNombre.includes('caliper') || equipoNombre.includes('pie de rey') || equipoNombre.includes('micrometro') || equipoNombre.includes('indicador');
            esPresion = equipoNombre.includes('manom') || equipoNombre.includes('presion') || equipoNombre.includes('vacuo');
            esTemperatura = equipoNombre.includes('termo') || equipoNombre.includes('temp') || equipoNombre.includes('pirometro');
            esElectrica = equipoNombre.includes('multimetro') || equipoNombre.includes('amperimetro');
            esDureza = equipoNombre.includes('durometro') || equipoNombre.includes('dureza');
            esTiempo = equipoNombre.includes('cronometro') || equipoNombre.includes('temporizador') || equipoNombre.includes('timer') || equipoNombre.includes('tiempo');
            esFrecuencia = equipoNombre.includes('frecuencia') || equipoNombre.includes('osciloscopio') || equipoNombre.includes('tacometro') || equipoNombre.includes('centrifuga');
            esOptica = equipoNombre.includes('optica') || equipoNombre.includes('óptica') || equipoNombre.includes('luxometro') || equipoNombre.includes('luz');
            esQuimica = equipoNombre.includes('quimic') || equipoNombre.includes('químic') || equipoNombre.includes('ph') || equipoNombre.includes('conducti');
            esTorque = equipoNombre.includes('torque') || equipoNombre.includes('par torsional') || equipoNombre.includes('torquimetro');
            esVolumen = equipoNombre.includes('volumen') || equipoNombre.includes('volúmen') || equipoNombre.includes('pipeta') || equipoNombre.includes('matraz');
            esMasa = equipoNombre.includes('masa') || equipoNombre.includes('balanza') || equipoNombre.includes('bascula') || equipoNombre.includes('báscula') || equipoNombre.includes('pesa');
        }

        // Si no es ninguno de los anteriores, es Genérico
        const esGenerico = !esPresion && !esTemperatura && !esDimensional && !esElectrica && !esDureza && !esTiempo && !esFrecuencia && !esOptica && !esQuimica && !esTorque && !esVolumen && !esMasa;

        return (
            <div className="p-6 max-w-5xl mx-auto space-y-6 bg-slate-50 min-h-screen font-sans text-slate-600">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setSelectedItem(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold uppercase text-xs transition-colors">
                        <ArrowLeft size={16} /> Volver a la Orden
                    </button>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-800 font-bold uppercase">{selectedItem.equipo}</span>
                    <span className="text-slate-400 text-sm">ID: {selectedItem.identificacion}</span>
                </div>
                
                {/* Router de Formularios */}
                {esPresion ? <PressureCalibrationForm itemId={selectedItem.id} /> : 
                 esTemperatura ? <TemperatureCalibrationForm itemId={selectedItem.id} orderId={id as string} /> : 
                 esDimensional ? <DimensionalCalibrationForm itemId={selectedItem.id} /> : 
                 esElectrica ? <ElectricalCalibrationForm itemId={selectedItem.id} orderId={id as string} /> :
                 esDureza ? <HardnessCalibrationForm itemId={selectedItem.id} orderId={id as string} /> :
                 esTiempo ? <TimeCalibrationForm itemId={selectedItem.id} orderId={id as string} /> :
                 (esFrecuencia || esOptica) ? <OpticsCalibrationForm itemId={selectedItem.id} orderId={id as string} magnitud={esOptica ? 'Óptica' : 'Frecuencia'} /> :
                 esQuimica ? <ChemistryCalibrationForm itemId={selectedItem.id} orderId={id as string} /> :
                 esTorque ? <TorqueCalibrationForm itemId={selectedItem.id} orderId={id as string} /> :
                 esVolumen ? <VolumeCalibrationForm itemId={selectedItem.id} orderId={id as string} /> :
                 esMasa ? <MassCalibrationForm itemId={selectedItem.id} orderId={id as string} /> :
                 <GenericCalibrationForm itemId={selectedItem.id} magnitud={selectedItem.magnitud || 'Generico'} />}
            </div>
        )
    }

    // --- VISTA PRINCIPAL DE LA ORDEN ---
    return (
        <div className="p-2 max-w-7xl mx-auto space-y-2 bg-slate-100 min-h-screen font-sans text-slate-800 pb-20">
            
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-dashboard, #printable-dashboard * { visibility: visible; }
                    #printable-dashboard {
                        position: absolute; left: 0; top: 0; width: 100%;
                        margin: 0; padding: 0; background: white; z-index: 99999;
                    }
                    .no-print { display: none !important; }
                    @page { size: auto; margin: 5mm; }
                }
            `}</style>

            {/* HEADER DE ACCIONES (Actualizado con Progreso y Finalizar) */}
            <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 no-print mb-4">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold uppercase text-xs transition px-2">
                        <ArrowLeft size={16} /> Volver
                    </button>
                    
                    {/* BARRA DE PROGRESO */}
                    <div className="flex-1 mx-8 hidden md:block">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
                            <span>Progreso de Calibración</span>
                            <span>{completedItems} / {totalItems} Equipos</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-2 rounded-full transition-all duration-500 ${isOrderComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase hover:bg-slate-50 transition" onClick={() => window.print()}>
                            <Printer size={16}/> Imprimir
                        </button>
                        
                        <button onClick={handleSaveOrder} disabled={saving} className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-1.5 rounded-lg text-xs font-bold uppercase hover:bg-slate-200 transition">
                            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar
                        </button>

                        {/* BOTÓN FINALIZAR */}
                        <button 
                            onClick={handleFinalizeOrder} 
                            disabled={finishing} 
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-xs font-bold uppercase transition shadow-md text-white
                                ${isOrderComplete ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' : 'bg-slate-700 hover:bg-slate-800'}
                            `}
                        >
                            {finishing ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} 
                            {isOrderComplete ? 'Finalizar Orden' : 'Forzar Cierre'}
                        </button>
                    </div>
                </div>
                {/* Barra progreso movil */}
                <div className="md:hidden mt-2">
                     <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${isOrderComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            <div id="printable-dashboard" className="bg-white shadow-xl rounded-sm overflow-hidden border border-slate-300 print:shadow-none print:border-none print:w-full">
                
                <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-black tracking-widest uppercase">Orden de Servicio</h1>
                        <p className="text-[9px] opacity-70 font-mono">F7.1-10 | REV.01</p>
                    </div>
                    <div className="text-right"><p className="text-xl font-mono font-bold text-amber-400">{order.folio}</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-200 text-xs">
                    <div className="p-3 border-r border-slate-200 space-y-2 bg-slate-50">
                        <h3 className="font-bold text-[10px] uppercase text-slate-400">Datos Generales</h3>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-500">FECHA RECEPCIÓN</label>
                            <div className="font-bold text-slate-700">{safeDate(order.created_at)}</div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-500">REGISTRÓ</label>
                            <div className="uppercase text-slate-700">{order.user_id || 'SISTEMA'}</div>
                        </div>
                    </div>

                    <div className="p-3 border-r border-slate-200 space-y-2 col-span-2">
                        <h3 className="font-bold text-[10px] uppercase text-slate-400 flex items-center gap-2"><User size={12}/> Asignación</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">INGENIERO METRÓLOGO</label>
                                <select className="w-full border border-slate-300 rounded p-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none" value={order.metrologo || ''} onChange={(e) => updateOrderField('metrologo', e.target.value)}>
                                    <option value="">-- Seleccionar --</option>
                                    <option value="Enrique Casas">Enrique Casas</option>
                                    <option value="Juan Perez">Juan Perez</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">FECHA PROGRAMADA</label>
                                <input type="date" className="w-full border border-slate-300 rounded p-1 text-slate-700" value={order.fecha_programada ? order.fecha_programada.split('T')[0] : ''} onChange={(e) => updateOrderField('fecha_programada', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">FECHA ESTIMADA</label>
                                <input type="date" className="w-full border border-slate-300 rounded p-1 text-slate-700" value={order.fecha_estimada ? order.fecha_estimada.split('T')[0] : ''} onChange={(e) => updateOrderField('fecha_estimada', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 space-y-2 bg-slate-50/50">
                        <h3 className="font-bold text-[10px] uppercase text-slate-400 flex items-center gap-2"><Truck size={12}/> Recepción</h3>
                        <div className="space-y-0.5">
                            {['Paquetería', 'Personalmente', 'Sitio'].map((tipo) => (
                                <label key={tipo} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-0.5 rounded">
                                    <input type="radio" name="medio_recepcion" value={tipo} checked={order.medio_recepcion === tipo} onChange={(e) => updateOrderField('medio_recepcion', e.target.value)} className="text-blue-600 focus:ring-blue-500 scale-90"/>
                                    <span className="uppercase font-medium text-[10px]">{tipo === 'Sitio' ? 'Servicio en Campo' : tipo}</span>
                                </label>
                            ))}
                        </div>
                        {order.medio_recepcion === 'Paquetería' && (
                            <div className="mt-1">
                                <label className="block text-[9px] font-bold text-slate-500">NO. GUÍA</label>
                                <input type="text" value={order.guia || ''} onChange={(e) => updateOrderField('guia', e.target.value)} className="w-full border-b border-slate-300 bg-transparent py-0.5 focus:border-blue-500 outline-none uppercase text-[10px]" placeholder="Ingrese guía..."/>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-200 text-xs">
                    <div className="p-3 border-r border-slate-200 grid grid-cols-2 gap-3 bg-white">
                        <div>
                            <label className="block text-[9px] font-bold text-slate-500">ENTREGÓ (CLIENTE)</label>
                            <input type="text" value={order.entrego || ''} onChange={(e) => updateOrderField('entrego', e.target.value)} className="w-full border border-slate-300 rounded p-1 uppercase mt-0.5" placeholder="Nombre..."/>
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-500">RECIBIÓ (METKAL)</label>
                            <input type="text" value={order.recibio || ''} onChange={(e) => updateOrderField('recibio', e.target.value)} className="w-full border border-slate-300 rounded p-1 uppercase mt-0.5" placeholder="Nombre..."/>
                        </div>
                    </div>
                    <div className="p-3 bg-amber-50/50">
                        <h3 className="font-bold text-[10px] uppercase text-amber-600 mb-1 flex items-center gap-2">Datos del Cliente</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <div className="col-span-2"><span className="font-bold text-slate-500 text-[10px]">EMPRESA:</span> <span className="font-bold uppercase text-[10px]">{order.client?.empresa}</span></div>
                            <div className="col-span-2"><span className="font-bold text-slate-500 text-[10px]">CONTACTO:</span> <span className="uppercase text-[10px]">{order.contact?.nombre || 'N/A'}</span></div>
                            <div><span className="font-bold text-slate-500 text-[10px]">TEL:</span> <span className="font-mono text-[10px]">{order.contact?.telefono || 'S/N'}</span></div>
                            <div><span className="font-bold text-slate-500 text-[10px]">EMAIL:</span> <span className="lowercase truncate block max-w-[150px] text-[10px]">{order.contact?.correo || 'S/N'}</span></div>
                        </div>
                    </div>
                </div>

                <div className="p-3">
                    <h3 className="font-bold text-xs uppercase text-slate-700 mb-2 pl-2 border-l-4 border-blue-600">Equipos Registrados ({items.length})</h3>
                    <div className="overflow-x-auto rounded border border-slate-200">
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                                <tr>
                                    <th className="p-2 w-8 text-center">#</th>
                                    <th className="p-2 w-28">No. Certificado</th>
                                    <th className="p-2">Descripción Equipo</th>
                                    <th className="p-2 w-28">Identificación</th>
                                    <th className="p-2 w-20">Servicio</th>
                                    <th className="p-2 w-32">Magnitud</th>
                                    <th className="p-2 text-center w-20 no-print">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2 text-center font-bold text-slate-400">{index + 1}</td>
                                        <td className="p-2 font-mono font-bold text-blue-700">{`C-${order.folio.split('/')[1]}-${index + 1}`}</td>
                                        <td className="p-2">
                                            <p className="font-bold text-slate-800 uppercase">{item.equipo}</p>
                                            <p className="text-[9px] text-slate-500 uppercase">{item.marca} • {item.modelo} • S/N: {item.no_serie}</p>
                                        </td>
                                        <td className="p-2 font-mono text-slate-600">{item.identificacion}</td>
                                        <td className="p-2 font-bold uppercase text-slate-500">{item.servicio || 'Lab'}</td>
                                        <td className="p-2">
                                            <select className="w-full border border-slate-200 rounded p-0.5 text-[9px] uppercase bg-slate-50 focus:bg-white outline-none" value={item.magnitud || ''} onChange={(e) => updateItemMagnitude(item.id, e.target.value)}>
                                                <option value="">-- Seleccionar --</option>
                                                <option value="Dureza">Dureza</option>
                                                <option value="Eléctrica">Eléctrica</option>
                                                <option value="Frecuencia">Frecuencia</option>
                                                <option value="Masa">Masa</option>
                                                <option value="Óptica">Óptica</option>
                                                <option value="Química">Química</option>
                                                <option value="Tiempo">Tiempo</option>
                                                <option value="Torque">Torque</option>
                                                <option value="Volumen">Volumen</option>
                                            </select>
                                        </td>
                                        <td className="p-2 text-center no-print">
                                            {item.estatus_tecnico === 'Terminado' ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full flex items-center justify-center gap-1 w-full border border-emerald-100">
                                                        <CheckCircle2 size={8}/> OK
                                                    </span>
                                                    <div className="flex justify-center gap-1">
                                                        <a href={`/certificados/${item.id}`} target="_blank" className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700" title="Ver Certificado"><FileText size={12}/></a>
                                                        <a href={`/resultados/${item.id}`} target="_blank" className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700" title="Ver Resultados"><FileText size={12}/></a>
                                                        <a href={`/etiquetas/${item.id}`} target="_blank" className="bg-slate-700 text-white p-1 rounded hover:bg-slate-800" title="Imprimir Etiqueta"><Printer size={12}/></a>
                                                    </div>
                                                    <button onClick={() => setSelectedItem(item)} className="text-[8px] text-slate-400 underline hover:text-red-500">Recapturar</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setSelectedItem(item)} className="bg-slate-800 text-white px-2 py-1 rounded text-[9px] font-bold uppercase hover:bg-black transition flex items-center justify-center gap-1 mx-auto shadow-sm w-full"><Wrench size={10}/> Capturar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {items.length === 0 && <div className="p-4 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded mt-2 text-xs">Sin equipos registrados.</div>}
                </div>

                <div className="bg-slate-50 p-3 border-t border-slate-200">
                    <label className="block text-[9px] font-bold text-slate-500 mb-0.5">OBSERVACIONES / COMENTARIOS</label>
                    <textarea className="w-full border border-slate-300 rounded p-1.5 text-xs h-12 resize-none focus:ring-1 focus:ring-blue-500 outline-none" value={order.comentarios || ''} onChange={(e) => updateOrderField('comentarios', e.target.value)} placeholder="Observaciones generales de la orden..."></textarea>
                </div>
            </div>
        </div>
    )
}