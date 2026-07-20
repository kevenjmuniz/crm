import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, decodeSession } from '@/lib/auth';

const AGENT_BLOCKED_PREFIXES = [
  '/pipeline',
  '/contacts',
  '/campaigns',
  '/instances',
  '/team',
  '/settings',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }
  const session = decodeSession(req.cookies.get(AUTH_COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (
    session.role === 'AGENT' &&
    AGENT_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL('/conversations', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};
