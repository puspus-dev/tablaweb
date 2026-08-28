export interface Institute {
  code: string;
  name: string;
  city: string;
}

/** Felhasználói / közösségi lista – elsődleges forrás */
const CUSTOM_LIST = '/sulinet/iskolak-v1.json';

let cache: Institute[] | null = null;

function pick(r: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function normalizeList(data: unknown): Institute[] {
  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    // { schools: [...] } / { intezmenyek: [...] } / { data: [...] }
    for (const k of ['schools', 'iskolak', 'intezmenyek', 'institutes', 'data', 'items']) {
      if (Array.isArray(o[k])) {
        rows = o[k] as unknown[];
        break;
      }
    }
  }

  const out: Institute[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const code = pick(r, [
      'instituteCode',
      'InstituteCode',
      'azonosito',
      'Azonosito',
      'omKod',
      'OmKod',
      'code',
      'kod',
      'KretaAzonosito',
      'kretaAzonosito',
      'kreta_code',
    ]);
    const name = pick(r, [
      'name',
      'Name',
      'nev',
      'Nev',
      'rovidNev',
      'RovidNev',
      'iskolaNev',
      'IskolaNev',
    ]);
    const city = pick(r, [
      'city',
      'City',
      'telepules',
      'Telepules',
      'varos',
      'Varos',
      'helyseg',
    ]);
    if (code && name) out.push({ code, name, city });
  }

  const seen = new Set<string>();
  return out.filter((i) => {
    const k = i.code.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function tryFetch(url: string, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json', ...headers },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Intézménylista:
 * 1) sulinet.site.je/iskolak-v1.json (te listád)
 * 2) KRÉTA publikus API-k tartalékként
 */
export async function fetchInstitutes(): Promise<Institute[]> {
  if (cache) return cache;

  // 1) Saját lista
  const custom = await tryFetch(CUSTOM_LIST);
  const customList = normalizeList(custom);
  if (customList.length > 0) {
    cache = customList;
    return customList;
  }

  // 2) KRÉTA tartalékok
  const headers = {
    apiKey: '7856d350-1fda-45f5-822d-e1a2f3f1acf0',
    'user-agent':
      'eKretaStudent/264745 CFNetwork/1494.0.7 Darwin/23.4.0',
  };
  const urls = [
    '/global/intezmenyek/kreta/publikus',
    '/global-mobile/api/v3/Institute',
    '/global-mobile/api/v1/Institute',
    '/global-mobile-old/api/v1/Institute',
  ];

  for (const url of urls) {
    const data = await tryFetch(url, headers);
    const list = normalizeList(data);
    if (list.length > 0) {
      cache = list;
      return list;
    }
  }

  return [];
}

export function filterInstitutes(list: Institute[], q: string): Institute[] {
  const s = q.trim().toLowerCase();
  if (!s) return list.slice(0, 30);
  return list
    .filter(
      (i) =>
        i.name.toLowerCase().includes(s) ||
        i.city.toLowerCase().includes(s) ||
        i.code.toLowerCase().includes(s)
    )
    .slice(0, 40);
}

export function resolveInstituteCode(
  selected: Institute | null,
  query: string
): string {
  if (selected?.code) return selected.code.trim();
  const q = query.trim();
  if (/^[a-zA-Z0-9._-]+$/.test(q)) return q;
  return q.split(/\s+/)[0] || '';
}
