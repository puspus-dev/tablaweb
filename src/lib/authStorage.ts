import type { StoredAuth } from '../types/kreta';

const KEY = 'ekreta_auth';

export function saveAuth(auth: StoredAuth): void {
  localStorage.setItem(KEY, JSON.stringify(auth));
}

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(KEY);
}

export function isTokenValid(auth: StoredAuth | null): boolean {
  if (!auth?.accessToken) return false;
  // 60 mp puffer a lejárat előtt
  return Date.now() < auth.expiresAt - 60_000;
}
