import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// 定义公共路径
const publicPaths = ['/login', '/api/auth']

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // 检查是否是公共路径
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  )

  // 如果没有session且不是公共路径，重定向到登录页
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 如果已登录但访问登录页，重定向到首页
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 匹配所有路径，但排除静态资源和API路由
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'
  ]
}