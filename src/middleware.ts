import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware to handle authentication redirects and host-based routing:
 * - Unauthenticated visitors to /dashboard, /tenants, /user, /admin, /project are immediately redirected to /login
 * - Path aliases: /tenants & /admin -> /dashboard/tenants, /user & /users -> /dashboard/settings
 * - Subdomain routing: admin-estateflow.* / admin.localhost -> Admin Console
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Skip static resources and system assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Detect admin subdomains (prod: admin-estateflow.remotizedit.online / admin.estateflow.*, dev: admin-localhost / admin.localhost)
  const isAdminSubdomain =
    host.startsWith('admin-estateflow') ||
    host.startsWith('admin.estateflow') ||
    host.startsWith('admin-localhost') ||
    host.startsWith('admin.localhost');

  const hasAuthSession = request.cookies.has('auth_session');

  // Convenience direct path aliases
  if (pathname === '/admin' || pathname === '/tenants') {
    if (!hasAuthSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard/tenants', request.url));
  }

  if (pathname === '/user' || pathname === '/users') {
    if (!hasAuthSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard/settings', request.url));
  }

  // Protected application routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/project');

  if (isProtectedRoute && !hasAuthSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAdminSubdomain) {
    // On the admin subdomain, landing on root directs straight to Super Admin or login
    if (pathname === '/') {
      if (!hasAuthSession) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard/tenants', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
