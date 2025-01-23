import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n, type Locale } from '@/lib/i18n/i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

function getLocale(request: NextRequest): string {
  // 获取 Accept-Language
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  // @ts-ignore locales are readonly
  const locales: string[] = i18n.locales;
  
  let languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  const locale = matchLocale(languages, locales, i18n.defaultLocale);
  
  return locale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 检查是否已经有语言前缀
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale: Locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // 如果没有语言前缀，重定向到正确的语言
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    
    // 例如，重定向 `/about` 到 `/en/about`
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
        request.url
      )
    );
  }
}

export const config = {
  matcher: [
    // 只匹配页面路由，排除所有静态资源、API路由等
    '/((?!api|_next|.*\\.|video|fonts|image|favicon.ico).*)'
  ]
}; 