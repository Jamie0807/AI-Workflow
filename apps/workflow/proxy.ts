import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Public paths that don't require authentication
const publicPaths = ['/account/login', '/account/verify', '/api/auth/register', '/api/auth/login', '/api/auth/verify']

// Static assets and Next.js internals
const ignorePaths = ['/_next', '/favicon.ico', '/public']

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip static assets and Next.js internals
    if (ignorePaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next()
    }

    // Allow public paths
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next()
    }

    // Check for auth token
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
        // API requests return 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        // Page requests redirect to login
        const loginUrl = new URL('/account/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
