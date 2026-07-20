import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, decodeSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = decodeSession(req.cookies.get(AUTH_COOKIE)?.value);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
