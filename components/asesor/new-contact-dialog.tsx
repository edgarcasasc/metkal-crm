'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"

export function NewContactDialog({ clientId, onContactCreated }: { clientId: string, onContactCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('contacts')
      .insert([
        {
          client_id: clientId, // ¡Importante! Vinculamos al cliente actual
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        }
      ])

    setLoading(false)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setFormData({ name: '', email: '', phone: '' })
      setOpen(false)
      onContactCreated() // Recarga la lista en la pantalla principal
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-slate-900">
          <Plus className="h-4 w-4 mr-2" /> Nuevo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Contacto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="c_name">Nombre Completo *</Label>
            <Input 
              id="c_name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c_email">Correo Electrónico</Label>
            <Input 
              id="c_email" 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c_phone">Teléfono / Celular</Label>
            <Input 
              id="c_phone" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full bg-slate-900">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Contacto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}