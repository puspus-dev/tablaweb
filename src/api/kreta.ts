import type {
  AuthCredentials,
  TokenResponse,
  StudentInfo,
  Lesson,
  SchoolYearEvent,
  KretaGrade,
  SubjectAverage,
} from '../types/kreta';

/** Folio / hivatalos mobil kliens konstansok (PKCE) */
export const CLIENT_ID = 'kreta-ellenorzo-student-mobile-ios';

export const USER_AGENT =
  'eKretaStudent/264745 CFNetwork/1494.0.7 Darwin/23.4.0';

export const REDIRECT_URI =
  'https://mobil.e-kreta.hu/ellenorzo-student/prod/oauthredirect';

/** Fix PKCE páros – a hivatalos mobil app is ezt használja */
export const CODE_VERIFIER =
  'DSpuqj_HhDX4wzQIbtn8lr8NLE5wEi1iVLMtMK0jY6c';

export const CODE_CHALLENGE =
  'HByZRRnPGb-Ko_wTI7ibIba1HQ6lor0ws4bcgReuYSQ';

const API_KEY = '21ff6c25-d1da-4a68-a811-c881a6057463';

const POLICY_KEY_STR = 'baSsxOwlU1jM';

const SCOPES = [
  'openid',
  'email',
  'offline_access',
  'kreta-ellenorzo-webapi.public',
  'kreta-eugyintezes-webapi.public',
  'kreta-fileservice-webapi.public',
  'kreta-mobile-global-webapi.public',
  'kreta-dkt-webapi.public',
  'kreta-ier-webapi.public',
].join(' ');

/**
 * Friss nonce lekérése a KRÉTA IDP-től.
 *
 * Fejlesztéskor a Vite proxy miatt:
 *   /idp/nonce
 *
 * ide kerül továbbításra:
 *   https://idp.e-kreta.hu/nonce
 */
export async function getNonce(): Promise<string> {
  const res = await fetch('/idp/nonce', {
    headers: {
      'user-agent': USER_AGENT,
      accept: '*/*',
    },
  });

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `Nonce lekérés sikertelen: ${res.status} – ${text.slice(0, 300)}`
    );
  }

  const nonce = (await res.text()).trim();

  if (!nonce) {
    throw new Error('Üres nonce az IDP-től');
  }

  return nonce;
}

/**
 * KRÉTA OAuth authorize URL (PKCE).
 *
 * Fontos:
 * A nonce-t minden indításkor frissen lekérjük,
 * ezért ez a függvény async.
 */
export async function getAuthorizeUrl(
  state = 'tablaweb'
): Promise<string> {
  const nonce = await getNonce();

  const params = new URLSearchParams({
    prompt: 'login',
    nonce,
    response_type: 'code',
    code_challenge_method: 'S256',
    scope: SCOPES,
    code_challenge: CODE_CHALLENGE,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    state,
    suppressed_prompt: 'login',
  });

  return `https://idp.e-kreta.hu/connect/authorize?${params}`;
}

async function hmacSha512Base64(
  message: string,
  key: string
): Promise<string> {
  const enc = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    {
      name: 'HMAC',
      hash: 'SHA-512',
    },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    enc.encode(message)
  );

  const bytes = new Uint8Array(sig);

  let binary = '';

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

async function getPolicyHeaders(
  instituteCode: string,
  username: string
): Promise<Record<string, string>> {
  const nonce = await getNonce();

  const message =
    instituteCode.toUpperCase() +
    nonce +
    username.toUpperCase();

  const key = await hmacSha512Base64(
    message,
    POLICY_KEY_STR
  );

  return {
    'X-Authorizationpolicy-Key': key,
    'X-Authorizationpolicy-Version': 'v2',
    'X-Authorizationpolicy-Nonce': nonce,
  };
}

function idpFormHeaders(
  extra: Record<string, string> = {}
): HeadersInit {
  return {
    'content-type':
      'application/x-www-form-urlencoded; charset=UTF-8',
    accept: '*/*',
    'user-agent': USER_AGENT,
    ...extra,
  };
}

function apiHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'user-agent': USER_AGENT,
    accept: 'application/json',
    apiKey: API_KEY,
  };
}

/**
 * PKCE:
 * authorization code → token
 */
export async function loginWithCode(
  code: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    code_verifier: CODE_VERIFIER,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
  });

  const res = await fetch('/idp/connect/token', {
    method: 'POST',
    headers: idpFormHeaders(),
    body,
  });

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `Kódcsere sikertelen: ${res.status} – ${text.slice(0, 300)}`
    );
  }

  return res.json();
}

/**
 * Password grant (tartalék) – policy headerekkel.
 *
 * Ha unauthorized_client hibát kapsz,
 * használd a PKCE flowt.
 */
export async function login(
  creds: AuthCredentials
): Promise<TokenResponse> {
  const policy = await getPolicyHeaders(
    creds.instituteCode,
    creds.username
  );

  const body = new URLSearchParams({
    userName: creds.username,
    password: creds.password,
    institute_code: creds.instituteCode,
    grant_type: 'password',
    client_id: CLIENT_ID,
  });

  const res = await fetch('/idp/connect/token', {
    method: 'POST',
    headers: idpFormHeaders(policy),
    body,
  });

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `Bejelentkezés sikertelen: ${res.status} – ${text.slice(0, 300)}`
    );
  }

  return res.json();
}

export async function refreshAccessToken(
  instituteCode: string,
  refreshToken: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    institute_code: instituteCode,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_user_data: 'false',
  });

  const res = await fetch('/idp/connect/token', {
    method: 'POST',
    headers: idpFormHeaders(),
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Token frissítés sikertelen: ${res.status}`
    );
  }

  return res.json();
}

/** JWT payload kiolvasása (institute_code a tokenből). */
export function parseJwtPayload(
  token: string
): Record<string, unknown> {
  try {
    const part = token.split('.')[1];

    const json = atob(
      part.replace(/-/g, '+').replace(/_/g, '/')
    );

    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function instituteFromToken(
  accessToken: string
): string | null {
  const p = parseJwtPayload(accessToken);

  const code =
    (p['kreta:institute_code'] as string) ||
    (p.institute_code as string) ||
    null;

  return code || null;
}

export async function fetchStudent(
  instituteCode: string,
  accessToken: string
): Promise<StudentInfo> {
  const res = await fetch(
    `/kreta/${instituteCode}/ellenorzo/V3/Sajat/TanuloAdatlap`,
    {
      headers: apiHeaders(accessToken),
    }
  );

  if (!res.ok) {
    throw new Error(
      `TanuloAdatlap hiba: ${res.status}`
    );
  }

  return res.json();
}

export async function fetchTimetable(
  instituteCode: string,
  accessToken: string,
  from: string,
  to: string
): Promise<Lesson[]> {
  const params = new URLSearchParams({
    datumTol: from,
    datumIg: to,
  });

  const res = await fetch(
    `/kreta/${instituteCode}/ellenorzo/V3/Sajat/OrarendElemek?${params}`,
    {
      headers: apiHeaders(accessToken),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Órarend lekérés hiba: ${res.status}`
    );
  }

  const data = await res.json();

  return Array.isArray(data) ? data : [];
}

export async function fetchSchoolYearEvents(
  instituteCode: string,
  accessToken: string
): Promise<SchoolYearEvent[]> {
  const res = await fetch(
    `/kreta/${instituteCode}/ellenorzo/V3/Sajat/Intezmenyek/TanevRendjeElemek`,
    {
      headers: apiHeaders(accessToken),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Tanév rendje hiba: ${res.status}`
    );
  }

  const data = await res.json();

  return Array.isArray(data) ? data : [];
}

export function getCurrentWeekRange(
  ref = new Date()
): {
  from: string;
  to: string;
} {
  const d = new Date(ref);

  const day = d.getDay();

  const mondayOffset =
    day === 0 ? -6 : 1 - day;

  const monday = new Date(d);

  monday.setDate(
    d.getDate() + mondayOffset
  );

  const sunday = new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  const fmt = (x: Date) =>
    x.toISOString().slice(0, 10);

  return {
    from: fmt(monday),
    to: fmt(sunday),
  };
}

export async function fetchTimetableWeeks(
  instituteCode: string,
  accessToken: string,
  weekCount = 2
): Promise<Lesson[]> {
  const { from } = getCurrentWeekRange();

  const start = new Date(from);

  const end = new Date(start);

  end.setDate(
    start.getDate() +
      weekCount * 7 -
      1
  );

  const fmt = (x: Date) =>
    x.toISOString().slice(0, 10);

  return fetchTimetable(
    instituteCode,
    accessToken,
    fmt(start),
    fmt(end)
  );
}

export function instituteBase(
  instituteCode: string
): string {
  return `https://${instituteCode}.e-kreta.hu`;
}

export async function fetchGrades(
  instituteCode: string,
  accessToken: string
): Promise<KretaGrade[]> {
  const res = await fetch(
    `/kreta/${instituteCode}/ellenorzo/V3/Sajat/Ertekelesek`,
    {
      headers: apiHeaders(accessToken),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Jegyek lekérés hiba: ${res.status}`
    );
  }

  const data = await res.json();

  return Array.isArray(data) ? data : [];
}

export async function fetchSubjectAverages(
  instituteCode: string,
  accessToken: string
): Promise<SubjectAverage[]> {
  const res = await fetch(
    `/kreta/${instituteCode}/ellenorzo/V3/Sajat/Ertekelesek/Atlagok/TantargyiAtlagok`,
    {
      headers: apiHeaders(accessToken),
    }
  );

  if (!res.ok) {
    // nem kritikus – üres lista
    return [];
  }

  const data = await res.json();

  return Array.isArray(data) ? data : [];
}