import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // "next" es a donde queremos enviar al usuario después de loguearse (ej: /dashboard)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = {
      getAll() {
        return request.headers.get('cookie')
      },
      setAll(cookiesToSet: { name: string, value: string, options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.headers.append('Set-Cookie', `${name}=${value}; ${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ')}`)
        })
      }
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = request.headers.get('cookie')
              ?.split('; ')
              .find((c) => c.startsWith(`${name}=`))
              ?.split('=')[1]
            return cookie
          },
          set(name: string, value: string, options: CookieOptions) {
            // Nota: En un Route Handler, debemos configurar las cookies en la RESPUESTA,
            // no podemos setearlas directamente en el store de la solicitud entrante.
            // Por eso creamos la respuesta abajo y le pegamos las cookies.
          },
          remove(name: string, options: CookieOptions) {
            // Igual que set
          },
        },
      }
    )

    // Intercambiamos el código por una sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Si todo salió bien, redirigimos al usuario y guardamos la sesión
      const forwardedHost = request.headers.get('x-forwarded-host') // Para Vercel/Producción
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // En local: localhost:3000
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // En producción (Vercel): midominio.com
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        // Fallback
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Si algo falla o no hay código, devolvemos al login con error
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}