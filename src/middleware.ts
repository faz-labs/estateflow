import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware to handle subdomain and host-based routing:
 * - admin-estateflow.remotizedit.online & admin.localhost -> Admin Console (/dashboard/tenants)
 * - /admin path alias -> /dashboard/tenants
 * - estateflow.remotizedit.online & localhost:9002 -> Main App
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

  // Convenience direct path alias
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/dashboard/tenants', request.url));
  }

  if (isAdminSubdomain) {
    // On the admin subdomain, landing on root directs straight to the Super Admin console
    if (pathname === '/') {
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
