import { useMemo, useState } from 'react';
import {
  addDays,
  format,
  startOfWeek,
  isSameDay,
  isToday,
} from 'date-fns';
import { hu } from 'date-fns/locale';
import type { CalendarEvent } from '../types/calendar';

interface Props {
  events: CalendarEvent[];
  onRefresh?: () => void;
  refreshing?: boolean;
  studentName?: string;
  errors?: string[];
}

const TYPE_STYLES: Record<string, string> = {
  lesson: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100',
  public_holiday: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100',
  school_break: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100',
  transferred_rest: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 text-orange-900',
  working_saturday: 'bg-slate-100 dark:bg-slate-700 border-slate-300 text-slate-800',
};

export function WeekCalendar({
  events,
  onRefresh,
  refreshing,
  studentName,
  errors,
}: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const d of days) {
      map.set(format(d, 'yyyy-MM-dd'), []);
    }
    for (const ev of events) {
      // all-day: minden napra a tartományban
      if (ev.allDay) {
        for (const d of days) {
          if (d >= startOfDay(ev.start) && d <= startOfDay(ev.end)) {
            const key = format(d, 'yyyy-MM-dd');
            map.get(key)?.push(ev);
          }
        }
      } else {
        const key = format(ev.start, 'yyyy-MM-dd');
        map.get(key)?.push(ev);
      }
    }
    // órák idő szerint
    for (const list of map.values()) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    return map;
  }, [events, days]);

  function prevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }
  function nextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }
  function goToday() {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3 mb-3">
        <div className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
          <div className="min-w-0">
            <h1 className="font-semibold text-slate-900 dark:text-white truncate">
              {studentName || 'TáblaWeb'}
            </h1>
            <p className="text-xs text-slate-500">
              {format(weekStart, 'yyyy. MMM d.', { locale: hu })} –{' '}
              {format(addDays(weekStart, 6), 'MMM d.', { locale: hu })}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={prevWeek}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="Előző hét"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Ma
            </button>
            <button
              type="button"
              onClick={nextWeek}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="Következő hét"
            >
              ›
            </button>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50"
                aria-label="Frissítés"
              >
                {refreshing ? '…' : '↻'}
              </button>
            )}
            
          </div>
        </div>
      </header>

      {errors && errors.length > 0 && (
        <div className="max-w-3xl mx-auto w-full px-3 pt-2">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs p-2">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        </div>
      )}

      {/* Days */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-3 py-4 space-y-4">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) || [];
          const today = isToday(day);

          return (
            <section
              key={key}
              className={`rounded-xl border ${
                today
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              } overflow-hidden`}
            >
              <div
                className={`px-3 py-2 text-sm font-medium flex items-center justify-between ${
                  today
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="capitalize">
                  {format(day, 'EEEE', { locale: hu })}
                </span>
                <span className="text-xs opacity-80">
                  {format(day, 'MMM d.', { locale: hu })}
                </span>
              </div>

              <div className="p-2 space-y-1.5 min-h-[3rem]">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1 py-2">Nincs esemény</p>
                ) : (
                  dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                        TYPE_STYLES[ev.type] || TYPE_STYLES.lesson
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{ev.title}</div>
                          {ev.type === 'lesson' && (
                            <div className="text-xs opacity-80 mt-0.5 space-x-2">
                              {ev.period != null && <span>{ev.period}. óra</span>}
                              {ev.teacher && <span>{ev.teacher}</span>}
                              {ev.room && <span>· {ev.room}</span>}
                            </div>
                          )}
                        </div>
                        {!ev.allDay && (
                          <span className="text-xs opacity-70 shrink-0 tabular-nums">
                            {format(ev.start, 'HH:mm')}–{format(ev.end, 'HH:mm')}
                          </span>
                        )}
                      </div>
                      {(ev.hasHomework || ev.hasExam) && (
                        <div className="text-xs mt-1 flex gap-2">
                          {ev.hasHomework && <span>📝 Házi</span>}
                          {ev.hasExam && <span>📋 Dolgozat</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// isSameDay unused but available if needed later
void isSameDay;
