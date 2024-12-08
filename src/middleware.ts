import { NextResponse, NextRequest } from 'next/server'

const publicPaths = ['/','/login', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  )

  // 检查两种可能的 session token
  const sessionToken = 
    request.cookies.get('__Secure-authjs.session-token')?.value || 
    request.cookies.get('authjs.session-token')?.value
  
  if (!sessionToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'
  ]
}