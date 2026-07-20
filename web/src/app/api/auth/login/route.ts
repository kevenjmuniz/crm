import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const base = process.env.CRM_API_URL ?? 'http://localhost:3000/api';

  const upstream = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CRM_API_KEY ?? '',
    },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);

  if (!upstream || !upstream.ok) {
    const body = await upstream?.json().catch(() => ({}));
    return NextResponse.json(
      { error: body?.message ?? 'E-mail ou senha inválidos' },
      { status: upstream?.status ?? 502 },
    );
  }

  const { token, user } = await upstream.json();
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
