import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Crear una respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Esto es CRÍTICO: Actualiza las cookies en el request Y en el response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Refrescar sesión si es necesario
  // IMPORTANTE: getUser() es más seguro que getSession() en middleware
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Protección de Rutas
  const url = request.nextUrl.clone()
  const isLoginPage = url.pathname === '/login'
  const isAuthRoute = url.pathname.startsWith('/auth')
  const isPublicAsset = url.pathname.includes('.') // Detecta archivos como logo.png, style.css

  // CASO A: No logueado y trata de entrar a ruta protegida
  if (!user && !isLoginPage && !isAuthRoute && !isPublicAsset) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // CASO B: Ya logueado y trata de entrar al Login
  if (user && isLoginPage) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - _next/static (archivos estáticos de Next.js)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico
     * - Archivos con extensión (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}