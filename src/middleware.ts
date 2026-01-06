import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthFromRequest } from './lib/auth';

// Paths that don't require authentication
const publicPaths = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check authentication
  const auth = await getAuthFromRequest(request);

  if (!auth) {
    // Redirect to login for page requests
    if (!pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Return 401 for API requests
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
