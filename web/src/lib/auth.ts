export const AUTH_COOKIE = 'crm_session';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
}

/**
 * O cookie guarda o JWT emitido pela API (assinado la, verificado la).
 * Aqui so decodificamos o payload (sem checar assinatura) para decidir
 * se mostra a tela de login e para exibir nome/papel na sidebar — a
 * autorizacao de verdade acontece na API a cada chamada.
 */
export function decodeSession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    if (data.exp && data.exp * 1000 < Date.now()) return null;
    return { id: data.id, name: data.name, email: data.email, role: data.role };
  } catch {
    return null;
  }
}
