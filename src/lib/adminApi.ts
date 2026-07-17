export type AdminMode = 'standard' | 'secure';

export const ADMIN_API_TOKEN_STORAGE_KEY = 'junchae_admin_api_token';

export const apiMode = (mode: AdminMode) => (mode === 'secure' ? 'secure' : 'normal');

export function getAdminApiToken() {
  try {
    return localStorage.getItem(ADMIN_API_TOKEN_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function adminAuthHeaders(): Record<string, string> {
  const token = getAdminApiToken();
  return token ? { 'x-admin-token': token } : {};
}

export function isWriteRequest(init?: RequestInit) {
  const method = (init?.method || 'GET').toUpperCase();
  return method !== 'GET' && method !== 'HEAD';
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(isWriteRequest(init) ? adminAuthHeaders() : {}),
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.ok) {
    console.error('Admin API request failed', { path, status: res.status, body });
    throw new Error(body?.message || body?.error || `Request failed with ${res.status}`);
  }

  return body.data as T;
}

export async function loadSettings(mode: AdminMode, section: string) {
  return apiJson<Record<string, string>>(`/api/settings?mode=${apiMode(mode)}&section=${section}`);
}

export async function saveSettings(mode: AdminMode, section: string, settings: Record<string, string | boolean | number>) {
  return apiJson<Record<string, string>>('/api/settings', {
    method: 'POST',
    body: JSON.stringify({
      mode: apiMode(mode),
      section,
      settings,
    }),
  });
}
