import type { NagerHoliday } from '../types/calendar';

const BASE = 'https://date.nager.at/api/v3';

/**
 * Hivatalos magyar munkaszüneti napok (ünnepnapok) lekérése.
 * Nager.Date – ingyenes, kulcs nélküli, CORS-barát.
 */
export async function fetchPublicHolidays(year: number): Promise<NagerHoliday[]> {
  const res = await fetch(`${BASE}/PublicHolidays/${year}/HU`);
  if (!res.ok) {
    throw new Error(`Nager.Date hiba: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Több év ünnepnapjait egyszerre (aktuális + következő).
 */
export async function fetchPublicHolidaysRange(
  fromYear: number,
  toYear: number
): Promise<NagerHoliday[]> {
  const years = [];
  for (let y = fromYear; y <= toYear; y++) years.push(y);
  const results = await Promise.all(years.map(fetchPublicHolidays));
  return results.flat();
}
