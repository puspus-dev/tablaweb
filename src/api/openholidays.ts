import type { OpenHoliday } from '../types/calendar';

const BASE = 'https://openholidaysapi.org';

/**
 * Iskolai szünetek lekérése OpenHolidays API-ból (tartalék, ha a KRÉTA nem elérhető).
 * Magyarország országos tanév rendje.
 */
export async function fetchSchoolHolidays(
  validFrom: string, // YYYY-MM-DD
  validTo: string
): Promise<OpenHoliday[]> {
  const params = new URLSearchParams({
    countryIsoCode: 'HU',
    languageIsoCode: 'HU',
    validFrom,
    validTo,
  });

  const res = await fetch(`${BASE}/SchoolHolidays?${params}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`OpenHolidays hiba: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // Az API válasz formátuma változhat – normalizáljuk
  if (Array.isArray(data)) return data;
  if (data?.schoolHolidays && Array.isArray(data.schoolHolidays)) {
    return data.schoolHolidays;
  }
  return [];
}
