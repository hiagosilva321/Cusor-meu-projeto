// Base URL da API Express — em dev usa proxy relativo, em prod o Nginx faz o proxy
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** Chave do projeto (Pedir Caçamba ou outro tenant) para a API associar pedidos ao cliente certo. */
export function getCacambaClientApiKey(): string | undefined {
  if (typeof window !== 'undefined') {
    const w = window.__CACAMBAJA_ENV__;
    const k = (w?.cacambaClientApiKey ?? '').trim();
    if (k) return k;
  }
  const v = import.meta.env.VITE_CACAMBA_CLIENT_API_KEY;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function joinApi(path: string) {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE}/${p}`;
}

export async function apiPost<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const res = await fetch(joinApi(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || (data as { error?: string })?.error) {
    throw new Error((data as { error?: string })?.error || `Erro na API: ${res.status}`);
  }

  return data as T;
}

/** Chamadas com cookie (painel CEO: login, métricas, alterar senha). */
export async function apiFetchJson<T = unknown>(endpoint: string, init?: RequestInit): Promise<T> {
  const { headers: h, ...rest } = init || {};
  const headers = new Headers(h as HeadersInit);
  if (rest.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(joinApi(endpoint), {
    credentials: 'include',
    ...rest,
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Erro na API: ${res.status}`);
  }
  return data as T;
}
