import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { i18n, Locale } from '@/lib/i18n/config'

const locales = i18n.locales
const defaultLocale = i18n.defaultLocale

function getLocale(request: NextRequest): string {
  // 1. 首先检查 cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return cookieLocale
  }

  // 2. 检查 Accept-Language 头部
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    // 简单解析 Accept-Language
    // 例如: "zh-CN,zh;q=0.9,en;q=0.8" => ["zh-CN", "zh", "en"]
    const parsedLanguages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().toLowerCase())
      .map(lang => lang.split('-')[0]) // 只取主要语言代码

    // 使用类型谓词来进行类型检查
    const isValidLocale = (lang: string): lang is Locale => {
      return i18n.locales.includes(lang as Locale)
    }

    // 查找第一个匹配的语言
    const matchedLocale = parsedLanguages.find(isValidLocale)
    if (matchedLocale) {
      return matchedLocale
    }
  }

  // 3. 如果都没有匹配，返回默认语言
  return defaultLocale
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 检查路径是否已包含语言前缀
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // 如果路径中没有语言前缀，则添加
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request)

    // 特殊路径处理
    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${locale}`, request.url))
    }

    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    )
  }

  const response = NextResponse.next()

  // 将当前语言保存到 cookie
  const pathnameLocale = pathname.split('/')[1]
  if (locales.includes(pathnameLocale as any)) {
    response.cookies.set('NEXT_LOCALE', pathnameLocale)
  }

  return response
}

export const config = {
  matcher: [
    // 只匹配需要国际化的路由
    // 排除静态文件、API 路由和其他资源
    '/((?!api|_next|video|fonts|image|favicon.ico).*)',
  ],
}