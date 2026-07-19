'use client';

/** Chamadas do navegador passam pelo proxy /api/crm (a chave fica no servidor). */
export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`/api/crm${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message?.toString?.() ?? body?.error ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}
