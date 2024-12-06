import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
 
export default auth((req) => {
  const publicPaths = ['/', '/login', '/api/auth']
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname === path || 
    req.nextUrl.pathname.startsWith(path)
  )
  
  if (!req.auth && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}