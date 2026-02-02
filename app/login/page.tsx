import { login } from './actions' // Ya no importamos signup
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center">
               <ShieldCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Metkal CRM</CardTitle>
          <CardDescription>
            Acceso exclusivo para personal autorizado
          </CardDescription>
        </CardHeader>
        <form>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Corporativo</Label>
              <Input id="email" name="email" type="email" placeholder="admin@metkal.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button formAction={login} className="w-full bg-slate-900 hover:bg-slate-800">
              Iniciar Sesión
            </Button>
            {/* El botón de registrarse ha sido eliminado por seguridad */}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}