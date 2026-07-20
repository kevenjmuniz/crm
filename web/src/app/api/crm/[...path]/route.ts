import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

/**
 * Proxy para a API do CRM: o navegador nunca ve a x-api-key.
 * /api/crm/conversations -> ${CRM_API_URL}/conversations
 */
async function proxy(req: NextRequest, path: string[]) {
  const base = process.env.CRM_API_URL ?? 'http://localhost:3000/api';
  const url = new URL(`${base}/${path.join('/')}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const init: RequestInit = {
    method: req.method,
    headers: {
      'x-api-key': process.env.CRM_API_KEY ?? '',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(url, init);
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { error: 'CRM API indisponivel' },
      { status: 502 },
    );
  }
}

type Ctx = { params: { path: string[] } };

export function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
