import { NextResponse, NextRequest } from 'next/server'

// 定义哪些路径是公共访问的，不需要登录即可访问
const publicPaths = ['/', '/login', '/api/auth']

export default function middleware(req: NextRequest) {
  const { nextUrl } = req
  const currentPath = nextUrl.pathname

  // 判断当前路径是否属于公共路径
  const isPublicPath = publicPaths.some(path => 
    currentPath === path || currentPath.startsWith(path)
  )

  // 从Cookie中检查是否存在sessionToken（这里假设你在登录成功后通过API路由或NextAuth回调将sessionToken写入cookie）
  const sessionToken = req.cookies.get('sessionToken')

  // 如果是非公共路径且没有sessionToken，则重定向到/login
  if (!sessionToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

// 匹配配置，可根据你自己的项目结构进行调整
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
