import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require auth
const PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/auth',
  '/verify-email',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/verify',
  '/api/auth/resend-verification',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|logo.svg|icons/).*)'],
};
