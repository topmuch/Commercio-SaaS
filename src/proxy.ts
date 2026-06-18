import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes (no auth needed)
  const publicPaths = [
    '/', '/login', '/register', '/demo', '/contact',
    '/boutique', '/install-app', '/mobile',
    '/api/', // All API routes handle their own auth
    '/_next', '/favicon.ico', '/manifest.json', '/sw.js', '/uploads',
  ]
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath) {
    return NextResponse.next()
  }

  // For non-public frontend routes, check JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin role for /admin paths
  const isAdminPath = pathname.startsWith('/admin')
  const userRole = token.role as string | undefined
  if (isAdminPath && userRole !== 'company_admin' && userRole !== 'super_admin' && userRole !== 'admin' && userRole !== 'director') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add user info to headers for API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', (token.sub || token.id || '') as string)
  requestHeaders.set('x-user-role', (userRole || '') as string)
  requestHeaders.set('x-company-id', (token.companyId || '') as string)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}