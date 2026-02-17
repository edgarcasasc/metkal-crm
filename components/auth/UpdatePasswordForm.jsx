// src/components/auth/UpdatePasswordForm.jsx
'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client' // Tu cliente supabase

export default function UpdatePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('¡Contraseña actualizada correctamente!')
      setNewPassword('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleUpdate} className="p-4 border rounded-lg max-w-md bg-white">
      <h3 className="text-lg font-bold mb-4">Cambiar Contraseña</h3>
      
      <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        placeholder="Mínimo 6 caracteres"
        required
      />

      <button 
        type="submit" 
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
      </button>
    </form>
  )
}