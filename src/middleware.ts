import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add any middleware logic here that doesn't involve i18n
  // For example, you might want to:
  // - Check authentication
  // - Add security headers
  // - Handle redirects
  // - etc.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api)
    // Skip all static files (images, favicon, etc)
    '/((?!api|_next|.*\\.|video|fonts|image|favicon.ico).*)'
  ]
}; 