export interface Institute {
  code: string;
  name: string;
  city: string;
}

/** Felhasználói / közösségi lista – elsődleges forrás */
const CUSTOM_LIST = '/sulinet/iskolak-v1.json';

/** KRÉTA saját intézménykeresője – élő autocomplete, nem kell API kulcs */
const INSTITUTE_SELECTOR = '/institute-selector/instituteSelector/';

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

function parseInstituteSelectorHtml(html: string): Institute[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: Institute[] = [];
  doc.querySelectorAll('a.dropdown-item').forEach((item) => {
    const code = item.getAttribute('data-val')?.trim() ?? '';
    if (!code) return;
    const text = item.textContent?.trim() ?? '';
    const name = (text.match(/^(.+?)\s*\(/)?.[1] ?? text).trim();
    if (!name) return;
    out.push({ code, name, city: '' });
  });
  return out;
}

/**
 * KRÉTA saját intézménykeresője – ugyanaz a végpont, amit a KRÉTA
 * belépő oldal is használ az autocomplete-hez. Nem kell API kulcs,
 * csak élő kereséshez való (legalább 3 karakter), nem ad teljes listát.
 */
export async function searchInstitutesFromKreta(query: string): Promise<Institute[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(
      `${INSTITUTE_SELECTOR}${encodeURIComponent(q)}?showOnlyLive=true`,
      { signal: ctrl.signal }
    );
    if (!res.ok) return [];
    return parseInstituteSelectorHtml(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
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
 * Intézménylista böngészéshez (amikor a user még nem írt keresést):
 * 1) sulinet.site.je/iskolak-v1.json (te listád)
 * 2) KRÉTA publikus API-k tartalékként (API kulcsot igényelnek)
 *
 * Élő kereséshez (>=3 karakter) a `searchInstitutesFromKreta` az elsődleges
 * forrás – az intézménykereső widget végpontja, amihez nem kell API kulcs.
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
