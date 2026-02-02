'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Loader2 } from "lucide-react"

// Recibimos una función para avisar que se creó alguien (y recargar la tabla)
export function NewClientDialog({ onClientCreated }: { onClientCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Guardamos los datos del formulario
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    is_american_date: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Insertar en Supabase
    const { error } = await supabase
      .from('clients')
      .insert([
        {
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          is_american_date: formData.is_american_date,
          // RFC y otros datos son opcionales por ahora
        }
      ])

    setLoading(false)

    if (error) {
      alert('Error al crear cliente: ' + error.message)
    } else {
      // Éxito: Limpiamos formulario, cerramos modal y recargamos tabla
      setFormData({ name: '', address: '', city: '', state: '', is_american_date: false })
      setOpen(false)
      onClientCreated() 
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos básicos para dar de alta al cliente.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Nombre */}
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre / Razón Social *</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ej: Industrias del Norte S.A." 
              required
            />
          </div>

          {/* Dirección */}
          <div className="grid gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input 
              id="address" 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Calle, Número y Colonia" 
            />
          </div>

          {/* Municipio y Estado (En 2 columnas) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">Municipio</Label>
              <Input 
                id="city" 
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                placeholder="Ej: Apodaca" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">Estado</Label>
              <Input 
                id="state" 
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                placeholder="Ej: Nuevo León" 
              />
            </div>
          </div>

          {/* Fecha Americana Checkbox */}
          <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50">
            <Checkbox 
              id="date_format" 
              checked={formData.is_american_date}
              onCheckedChange={(checked) => 
                setFormData({...formData, is_american_date: checked as boolean})
              }
            />
            <Label htmlFor="date_format" className="cursor-pointer">
              Usar Fecha Americana (mm/dd/yyyy)
            </Label>
          </div>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading} className="w-full bg-slate-900">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Crear Cliente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}