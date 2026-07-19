export const AUTH_COOKIE = 'crm_session';

/** Token derivado da senha — mesmo algoritmo no login (node) e no middleware (edge). */
export async function sessionToken(): Promise<string> {
  const secret = process.env.WEB_PASSWORD ?? '';
  const data = new TextEncoder().encode(`crm-web:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
