import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Role-Based Access Control map
// Key = path prefix, Value = allowed roles
const ROUTE_ROLES: Record<string, string[]> = {
  '/admin': ['Admin'],
  '/teacher': ['Teacher'],
  '/parent': ['Parent'],
  '/school-teacher': ['school_teacher', 'SchoolTeacher'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the 'role' cookie set by the login page
  // (We mirror the role into a cookie because localStorage is not accessible in Edge middleware)
  const roleCookie = request.cookies.get('madrasa_role')?.value;
  const hasToken = request.cookies.get('madrasa_auth')?.value;

  // --- Root redirect ---
  if (pathname === '/') {
    if (!hasToken || !roleCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const dashboardMap: Record<string, string> = {
      Admin: '/admin',
      Teacher: '/teacher',
      Parent: '/parent',
      school_teacher: '/school-teacher',
      SchoolTeacher: '/school-teacher',
    };
    const dest = dashboardMap[roleCookie] || '/login';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // --- Login page: already logged in → redirect to dashboard ---
  if (pathname === '/login') {
    if (hasToken && roleCookie) {
      const dashboardMap: Record<string, string> = {
        Admin: '/admin',
        Teacher: '/teacher',
        Parent: '/parent',
        school_teacher: '/school-teacher',
        SchoolTeacher: '/school-teacher',
      };
      const dest = dashboardMap[roleCookie] || '/login';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // --- Protected routes ---
  for (const [prefix, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(prefix)) {
      // No auth at all → redirect to login
      if (!hasToken || !roleCookie) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Wrong role → 403 page
      if (!allowedRoles.includes(roleCookie)) {
        return NextResponse.redirect(new URL('/403', request.url));
      }

      // Authorized — proceed
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/teacher/:path*',
    '/parent/:path*',
    '/school-teacher/:path*',
  ],
};
                                                                                                                                                                                                                                                                                                                                                                                                                                                          