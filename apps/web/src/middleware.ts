import { NextResponse, type NextRequest } from 'next/server';

const AUTH_PAGES = new Set(['/login', '/register']);
const PUBLIC_PAGES = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

/**
 * Edge route protection. Runs before pages render.
 *
 * We treat the PRESENCE of the refresh-token cookie as a session signal — enough to
 * redirect clearly-unauthenticated users away from the app and authenticated users
 * away from login. Cookie presence is NOT proof of validity: actual validity is
 * enforced server-side (the API verifies the token). This is an optimization to
 * avoid a flash of the wrong page, not the security boundary.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public shared-meeting links are viewable without a session.
  if (pathname.startsWith('/share/')) return NextResponse.next();

  const hasSessionCookie = Boolean(req.cookies.get('ama_refresh')?.value);

  // Root has no page of its own — send users to the app or to login.
  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSessionCookie ? '/dashboard' : '/login', req.url));
  }

  // Authenticated user hitting an auth page → send to the app.
  if (AUTH_PAGES.has(pathname) && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Unauthenticated user hitting a protected page → send to login (with `next`).
  if (!PUBLIC_PAGES.has(pathname) && !hasSessionCookie) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets and the Next internals.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
