'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ListFilter, Plus, Trash2, Loader2, Save, ChevronDown, ChevronUp, Beaker } from 'lucide-react'

type Magnitud = { id: number, nombre: string, config_json?: any }
type Unidad = { id: number, magnitud_id: number, nombre: string, factor_conversion: number }

export default function MagnitudesPage() {
    const supabase = createClient()
    const [magnitudes, setMagnitudes] = useState<Magnitud[]>([])
    const [unidades, setUnidades] = useState<Unidad[]>([])
    const [loading, setLoading] = useState(true)
    const [newMagnitud, setNewMagnitud] = useState('')
    const [saving, setSaving] = useState(false)
    const [expandedMag, setExpandedMag] = useState<number | null>(null)

    // Formulario de Unidad
    const [newUnidad, setNewUnidad] = useState('')
    const [newFactor, setNewFactor] = useState<number | ''>(1)
    const [savingUnidad, setSavingUnidad] = useState(false)

    // Configuración avanzada (Fórmulas)
    const defaultConfig = {
        muestras: 5,
        errorFormula: 'promedio_menos_nominal',
        uAFormula: 'stddev_div_sqrt_n',
        uAFactor: 1.4,
        uBPatron: 'global',
        hasCmc: false
    }
    const [newMagConfig, setNewMagConfig] = useState(defaultConfig)
    const [showAdvanced, setShowAdvanced] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        try {
            const [magsRes, unidsRes] = await Promise.all([
                supabase.from('magnitudes').select('*').order('nombre', { ascending: true }),
                supabase.from('magnitud_unidades').select('*').order('nombre', { ascending: true })
            ])
            
            if (magsRes.error) throw magsRes.error
            if (unidsRes.error && unidsRes.error.code !== '42P01') throw unidsRes.error // Ignore si la tabla no existe aún

            setMagnitudes(magsRes.data || [])
            setUnidades(unidsRes.data || [])
        } catch (e: any) {
            console.error("Error cargando magnitudes/unidades:", e.message)
            if (e.code === '42P01') {
                alert("La tabla de unidades no existe. Recuerda ejecutar el script SQL en Supabase.")
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleAddMagnitud(e: React.FormEvent) {
        e.preventDefault()
        if (!newMagnitud.trim()) return

        setSaving(true)
        try {
            const formatted = newMagnitud.trim().charAt(0).toUpperCase() + newMagnitud.trim().slice(1)
            const { error } = await supabase.from('magnitudes').insert({ 
                nombre: formatted,
                config_json: showAdvanced ? newMagConfig : null
            })
            if (error) throw error
            
            setNewMagnitud('')
            setNewMagConfig(defaultConfig)
            setShowAdvanced(false)
            await fetchData()
        } catch (e: any) {
            if (e.code === '23505') alert('Esa magnitud ya existe en el sistema.')
            else alert("Error al agregar magnitud: " + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteMagnitud(id: number, nombre: string) {
        if (!confirm(`¿Estás seguro de eliminar "${nombre}" y TODAS sus unidades?`)) return
        try {
            const { error } = await supabase.from('magnitudes').delete().eq('id', id)
            if (error) throw error
            await fetchData()
        } catch (e: any) {
            alert("Error al eliminar: " + e.message)
        }
    }

    async function handleAddUnidad(e: React.FormEvent, magnitud_id: number) {
        e.preventDefault()
        if (!newUnidad.trim()) return

        setSavingUnidad(true)
        try {
            const { error } = await supabase.from('magnitud_unidades').insert({ 
                magnitud_id, 
                nombre: newUnidad.trim(),
                factor_conversion: newFactor || 1
            })
            if (error) throw error
            
            setNewUnidad('')
            setNewFactor(1)
            await fetchData()
        } catch (e: any) {
            alert("Error al agregar unidad: " + e.message)
        } finally {
            setSavingUnidad(false)
        }
    }

    async function handleDeleteUnidad(id: number) {
        if (!confirm(`¿Estás seguro de eliminar esta unidad?`)) return
        try {
            const { error } = await supabase.from('magnitud_unidades').delete().eq('id', id)
            if (error) throw error
            await fetchData()
        } catch (e: any) {
            alert("Error al eliminar: " + e.message)
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                    <ListFilter size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestor de Magnitudes y Unidades</h1>
                    <p className="text-sm text-slate-500">Administra las magnitudes y sus unidades de medida dinámicas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Formulario de Alta Magnitud */}
                <div className="md:col-span-1">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
                        <h2 className="font-bold text-slate-700 uppercase text-xs mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-amber-500"/> Nueva Magnitud
                        </h2>
                        
                        <form onSubmit={handleAddMagnitud} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre</label>
                                <input 
                                    type="text" 
                                    value={newMagnitud}
                                    onChange={e => setNewMagnitud(e.target.value)}
                                    placeholder="Ej. Tiempo, Presión, Fuerza..."
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                                    required
                                />
                            </div>

                            {/* Togle Avanzado */}
                            <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
                                <label className="text-xs font-bold text-slate-600">Configurar Fórmulas Avanzadas</label>
                                <input type="checkbox" checked={showAdvanced} onChange={e => setShowAdvanced(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500"/>
                            </div>

                            {showAdvanced && (
                                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cant. de Muestras (n)</label>
                                        <select value={newMagConfig.muestras} onChange={e => setNewMagConfig({...newMagConfig, muestras: parseInt(e.target.value)})} className="w-full p-2 border rounded outline-none">
                                            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cálculo de Error</label>
                                        <select value={newMagConfig.errorFormula} onChange={e => setNewMagConfig({...newMagConfig, errorFormula: e.target.value})} className="w-full p-2 border rounded outline-none">
                                            <option value="promedio_menos_nominal">Promedio - Nominal (Estándar)</option>
                                            <option value="nominal_menos_promedio">Nominal - Promedio (Invertido / Torque)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Repetibilidad (Tipo A)</label>
                                        <select value={newMagConfig.uAFormula} onChange={e => setNewMagConfig({...newMagConfig, uAFormula: e.target.value})} className="w-full p-2 border rounded outline-none mb-2">
                                            <option value="stddev_div_sqrt_n">Desv. Estándar / raíz(n) (Estándar)</option>
                                            <option value="stddev_mult_factor">Desv. Estándar * Factor (Personalizado)</option>
                                        </select>
                                        {newMagConfig.uAFormula === 'stddev_mult_factor' && (
                                            <input type="number" step="0.01" value={newMagConfig.uAFactor} onChange={e => setNewMagConfig({...newMagConfig, uAFactor: parseFloat(e.target.value)})} className="w-full p-2 border rounded outline-none" placeholder="Factor (ej. 1.4)"/>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tolerancia Patrón (uB)</label>
                                        <select value={newMagConfig.uBPatron} onChange={e => setNewMagConfig({...newMagConfig, uBPatron: e.target.value})} className="w-full p-2 border rounded outline-none">
                                            <option value="global">Global (Un valor para toda la hoja)</option>
                                            <option value="per_point">Por Punto (Cada fila tiene su valor)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={newMagConfig.hasCmc} onChange={e => setNewMagConfig({...newMagConfig, hasCmc: e.target.checked})} id="hasCmcCheck"/>
                                        <label htmlFor="hasCmcCheck" className="text-[10px] font-bold text-slate-500 uppercase">Incluir Columna CMC Editable</label>
                                    </div>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={saving || !newMagnitud.trim()}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-lg font-bold text-xs uppercase transition shadow-md shadow-amber-200 flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                Guardar Magnitud
                            </button>
                        </form>
                    </div>
                </div>

                {/* Lista de Magnitudes y Unidades */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 uppercase text-xs">Magnitudes Registradas ({magnitudes.length})</h3>
                        </div>
                        
                        {loading ? (
                            <div className="p-12 flex justify-center text-slate-400">
                                <Loader2 size={32} className="animate-spin"/>
                            </div>
                        ) : magnitudes.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                No hay magnitudes registradas aún.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {magnitudes.map(mag => {
                                    const magUnidades = unidades.filter(u => u.magnitud_id === mag.id)
                                    const isExpanded = expandedMag === mag.id
                                    
                                    return (
                                    <div key={mag.id} className="transition">
                                        <div 
                                            className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer"
                                            onClick={() => setExpandedMag(isExpanded ? null : mag.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1 rounded ${isExpanded ? 'bg-amber-100 text-amber-600' : 'text-slate-400'}`}>
                                                    {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                                                </div>
                                                <span className="font-bold text-slate-700">{mag.nombre}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                                    {magUnidades.length} uni
                                                </span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteMagnitud(mag.id, mag.nombre) }}
                                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                                title="Eliminar Magnitud"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                        
                                        {/* Dropdown de Unidades */}
                                        {isExpanded && (
                                            <div className="bg-slate-50 p-4 border-t border-slate-100 shadow-inner">
                                                
                                                {/* Mostrar Info de Fórmulas si tiene config_json */}
                                                {mag.config_json && (
                                                    <div className="mb-4 bg-white p-3 rounded border border-slate-200 text-xs">
                                                        <h5 className="font-bold text-slate-600 mb-2">⚙️ Configuración de Fórmulas</h5>
                                                        <ul className="text-slate-500 space-y-1">
                                                            <li><span className="font-bold">Muestras (n):</span> {mag.config_json.muestras}</li>
                                                            <li><span className="font-bold">Error:</span> {mag.config_json.errorFormula === 'promedio_menos_nominal' ? 'Promedio - Nominal' : 'Nominal - Promedio'}</li>
                                                            <li><span className="font-bold">Repetibilidad (uA):</span> {mag.config_json.uAFormula === 'stddev_div_sqrt_n' ? 'Desv.Est. / raíz(n)' : `Desv.Est. * ${mag.config_json.uAFactor}`}</li>
                                                            <li><span className="font-bold">Tolerancia Patrón:</span> {mag.config_json.uBPatron === 'global' ? 'Global' : 'Por Punto'}</li>
                                                            <li><span className="font-bold">Columna CMC:</span> {mag.config_json.hasCmc ? 'Sí' : 'No'}</li>
                                                        </ul>
                                                    </div>
                                                )}

                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">
                                                    <Beaker size={12}/> Unidades de {mag.nombre}
                                                </h4>
                                                
                                                <div className="space-y-2 mb-4">
                                                    {mag.nombre === 'Presión' && (
                                                        <div className="mb-4">
                                                            <p className="text-xs text-slate-500 font-bold mb-2">Establecidas (Fijas del Sistema):</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {['PSI', 'BAR', 'mBAR', 'Pa', 'kPa', 'MPa', 'Kgs/cm2', 'mm H2O', 'In. H2O', 'mm Hg', 'cm.Hg', 'In.Hg', 'Kp/cm2 (at)'].map(u => (
                                                                    <span key={u} className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold">{u}</span>
                                                                ))}
                                                            </div>
                                                            {magUnidades.length > 0 && <p className="text-xs text-slate-500 font-bold mt-4 mb-2">Agregadas Manualmente:</p>}
                                                        </div>
                                                    )}
                                                    
                                                    {magUnidades.length === 0 && mag.nombre !== 'Presión' ? (
                                                        <p className="text-xs text-slate-400 italic">No hay unidades para esta magnitud.</p>
                                                    ) : (
                                                        magUnidades.map(u => (
                                                            <div key={u.id} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-md">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm font-bold text-slate-700">{u.nombre}</span>
                                                                    {u.factor_conversion !== 1 && (
                                                                        <span className="text-[9px] bg-sky-100 text-sky-700 px-2 rounded border border-sky-200">Factor: {u.factor_conversion}</span>
                                                                    )}
                                                                </div>
                                                                <button onClick={() => handleDeleteUnidad(u.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                <form onSubmit={(e) => handleAddUnidad(e, mag.id)} className="flex gap-2 items-end">
                                                    <div className="flex-1">
                                                        <input type="text" placeholder="Nueva unidad (ej. psi, seg...)" required className="w-full text-xs p-2 border rounded-md outline-none focus:border-amber-500" value={newUnidad} onChange={e => setNewUnidad(e.target.value)} />
                                                    </div>
                                                    <div className="w-24">
                                                        <input type="number" step="any" placeholder="Factor" className="w-full text-xs p-2 border rounded-md outline-none focus:border-amber-500" value={newFactor} onChange={e => setNewFactor(e.target.value === '' ? '' : parseFloat(e.target.value))} title="Factor de conversión matemático (deja 1 si no aplica)"/>
                                                    </div>
                                                    <button type="submit" disabled={savingUnidad} className="bg-slate-800 text-white p-2 rounded-md hover:bg-slate-700 transition">
                                                        <Plus size={16}/>
                                                    </button>
                                                </form>
                                                <p className="text-[9px] text-slate-400 mt-2">El <strong>Factor</strong> solo es necesario para magnitudes con matemática automática (ej. Presión a kPa).</p>
                                            </div>
                                        )}
                                    </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
