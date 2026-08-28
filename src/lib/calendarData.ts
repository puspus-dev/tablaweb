import { fetchPublicHolidaysRange } from '../api/nager';
import { fetchSchoolHolidays } from '../api/openholidays';
import {
  fetchTimetableWeeks,
  fetchSchoolYearEvents,
  fetchStudent,
} from '../api/kreta';
import type { Lesson, SchoolYearEvent, StoredAuth } from '../types/kreta';
import type { CalendarEvent, NagerHoliday, OpenHoliday } from '../types/calendar';

function parseIso(s: string): Date {
  // KRÉTA gyakran Z-vel adja; helyi napként kezeljük ahol kell
  return new Date(s);
}

function lessonToEvent(lesson: Lesson): CalendarEvent | null {
  // Tanév-rend eseményeket kihagyjuk az órarendből
  if (lesson.Tipus?.Nev === 'TanevRendjeEsemeny') return null;

  const start = parseIso(lesson.KezdetIdopont);
  const end = parseIso(lesson.VegIdopont);
  const subject = lesson.Tantargy?.Nev ?? lesson.Nev ?? 'Óra';

  return {
    id: lesson.Uid || `lesson-${lesson.KezdetIdopont}`,
    title: subject,
    start,
    end,
    type: 'lesson',
    subject,
    teacher: lesson.HelyettesTanarNeve || lesson.TanarNeve || undefined,
    room: lesson.TeremNeve || undefined,
    period: lesson.Oraszam,
    group: lesson.OsztalyCsoport?.Nev,
    theme: lesson.Tema || undefined,
    hasHomework: Boolean(lesson.HaziFeladatUid),
    hasExam: (lesson.BejelentettSzamonkeresUids?.length ?? 0) > 0,
    allDay: false,
    source: 'kreta',
  };
}

function nagerToEvent(h: NagerHoliday): CalendarEvent {
  const day = new Date(h.date + 'T00:00:00');
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return {
    id: `nager-${h.date}-${h.localName}`,
    title: h.localName || h.name,
    start: day,
    end,
    type: 'public_holiday',
    allDay: true,
    source: 'nager',
  };
}

function openHolidayToEvents(h: OpenHoliday): CalendarEvent[] {
  const name =
    h.name?.find((n) => n.language?.toLowerCase().startsWith('hu'))?.text ||
    h.name?.[0]?.text ||
    'Iskolai szünet';

  const start = new Date(h.startDate + 'T00:00:00');
  const end = new Date((h.endDate || h.startDate) + 'T23:59:59');

  return [
    {
      id: `oh-${h.id || h.startDate}-${name}`,
      title: name,
      start,
      end,
      type: 'school_break',
      allDay: true,
      source: 'openholidays',
    },
  ];
}

/**
 * KRÉTA TanévRendjeElemek → naptár események.
 * A pontos mezőnevek változhatnak; rugalmasan próbáljuk.
 */
function kretaYearEventsToCalendar(events: SchoolYearEvent[]): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  for (const ev of events) {
    const startStr =
      (ev.KezdoDatum as string) ||
      (ev.KezdetIdopont as string) ||
      (ev.Datum as string) ||
      null;
    const endStr =
      (ev.VegDatum as string) ||
      (ev.VegIdopont as string) ||
      startStr;

    if (!startStr) continue;

    const title =
      (ev.Nev as string) ||
      (ev.Leiras as string) ||
      (ev.Tipus as { Leiras?: string })?.Leiras ||
      'Tanév esemény';

    const start = parseIso(String(startStr));
    const end = parseIso(String(endStr));
    if (end.getTime() === start.getTime()) {
      end.setHours(23, 59, 59, 999);
    }

    result.push({
      id: `kreta-year-${(ev.Uid as string) || startStr}-${title}`,
      title: String(title),
      start,
      end,
      type: 'school_break',
      allDay: true,
      source: 'kreta',
    });
  }

  return result;
}

export interface LoadCalendarResult {
  events: CalendarEvent[];
  studentName?: string;
  errors: string[];
}

/**
 * Minden adat betöltése belépés után / frissítéskor.
 */
export async function loadCalendarData(auth: StoredAuth): Promise<LoadCalendarResult> {
  const errors: string[] = [];
  const events: CalendarEvent[] = [];
  let studentName = auth.studentName;

  const now = new Date();
  const year = now.getFullYear();

  // 1) Ünnepnapok – mindig Nager
  try {
    const holidays = await fetchPublicHolidaysRange(year, year + 1);
    events.push(...holidays.map(nagerToEvent));
  } catch (e) {
    errors.push(`Ünnepnapok (Nager): ${(e as Error).message}`);
  }

  // 2) Órarend – KRÉTA
  try {
    const lessons = await fetchTimetableWeeks(
      auth.instituteCode,
      auth.accessToken,
      3 // 3 hét
    );
    for (const lesson of lessons) {
      const ev = lessonToEvent(lesson);
      if (ev) events.push(ev);
    }
  } catch (e) {
    errors.push(`Órarend (KRÉTA): ${(e as Error).message}`);
  }

  // 3) Szünetek – először KRÉTA, ha nem megy → OpenHolidays
  let schoolBreaksLoaded = false;
  try {
    const yearEvents = await fetchSchoolYearEvents(
      auth.instituteCode,
      auth.accessToken
    );
    const mapped = kretaYearEventsToCalendar(yearEvents);
    if (mapped.length > 0) {
      events.push(...mapped);
      schoolBreaksLoaded = true;
    }
  } catch (e) {
    errors.push(`Tanév rendje (KRÉTA): ${(e as Error).message}`);
  }

  if (!schoolBreaksLoaded) {
    try {
      const from = `${year - 1}-08-01`;
      const to = `${year + 1}-08-31`;
      const oh = await fetchSchoolHolidays(from, to);
      for (const h of oh) {
        events.push(...openHolidayToEvents(h));
      }
    } catch (e) {
      errors.push(`Iskolai szünetek (OpenHolidays): ${(e as Error).message}`);
    }
  }

  // 4) Diák név (ha még nincs)
  if (!studentName) {
    try {
      const student = await fetchStudent(auth.instituteCode, auth.accessToken);
      studentName = student.Nev;
    } catch {
      // nem kritikus
    }
  }

  // Rendezés idő szerint
  events.sort((a, b) => a.start.getTime() - b.start.getTime());

  return { events, studentName, errors };
}
