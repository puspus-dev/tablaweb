import { useMemo } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import type { CalendarEvent } from '../types/calendar';
import type { KretaGrade } from '../types/kreta';

interface Props {
  events: CalendarEvent[];
  grades: KretaGrade[];
  studentName?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function gradeColor(n?: number | null) {
  if (n == null || n <= 0) return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
  if (n >= 5) return 'bg-emerald-500 text-white';
  if (n >= 4) return 'bg-lime-500 text-white';
  if (n >= 3) return 'bg-amber-400 text-slate-900';
  if (n >= 2) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

export function HomePage({
  events,
  grades,
  studentName,
  onRefresh,
  refreshing,
}: Props) {
  const todayLessons = useMemo(() => {
    return events
      .filter((e) => e.type === 'lesson' && e.start && isToday(e.start))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events]);

  const recentGrades = useMemo(() => {
    return [...grades]
      .sort((a, b) =>
        (b.KeszitesDatuma || b.RogzitesDatuma || '').localeCompare(
          a.KeszitesDatuma || a.RogzitesDatuma || ''
        )
      )
      .slice(0, 8);
  }, [grades]);

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {format(new Date(), 'yyyy. MMMM d., EEEE', { locale: hu })}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Szia{studentName ? `, ${studentName.split(' ')[0]}` : ''}!
          </h1>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-sm text-[var(--accent)] font-medium disabled:opacity-50"
          >
            {refreshing ? 'Frissítés…' : 'Frissítés'}
          </button>
        )}
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Mai órák
        </h2>
        {todayLessons.length === 0 ? (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
            Ma nincs óra a naptárban.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayLessons.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 flex gap-3"
              >
                <div className="text-xs font-mono text-slate-500 w-16 shrink-0 pt-0.5">
                  {l.start ? format(l.start, 'HH:mm') : '—'}
                  {l.end ? `–${format(l.end, 'HH:mm')}` : ''}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">
                    {l.title}
                  </div>
                  {(l.teacher || l.room) && (
                    <div className="text-xs text-slate-500 truncate">
                      {[l.teacher, l.room].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Legutóbbi jegyek
        </h2>
        {recentGrades.length === 0 ? (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
            Még nincs megjeleníthető jegy.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentGrades.map((g) => (
              <li
                key={g.Uid}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 flex items-center gap-3"
              >
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${gradeColor(g.SzamErtek)}`}
                >
                  {g.SzamErtek && g.SzamErtek > 0
                    ? g.SzamErtek
                    : (g.SzovegesErtekelesRovidNev || g.SzovegesErtek || '–').slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 dark:text-white truncate">
                    {g.Tantargy?.Nev || 'Ismeretlen tantárgy'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {[g.Tema, g.Mod?.Nev].filter(Boolean).join(' · ') || g.Tipus?.Nev}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  {g.KeszitesDatuma
                    ? format(parseISO(g.KeszitesDatuma), 'MM.dd')
                    : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
