import { NextResponse } from "next/server";

export function middleware() {
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
    "/((?!api|_next|.*\\.|video|fonts|image|favicon.ico).*)",
  ],
};
