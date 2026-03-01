import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Check if the user is trying to access protected paths
    if (pathname.startsWith('/dashboard')) {
        if (!token) {
            // No token, redirect to login
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }
    }

    // Check if auth pages are accessed by someone already logged in
    if (pathname === '/login' || pathname === '/register') {
        if (token) {
            // Already logged in, redirect to dashboard
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register'],
};
