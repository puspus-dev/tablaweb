import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { KretaGrade, SubjectAverage } from '../types/kreta';

interface Props {
  grades: KretaGrade[];
  averages: SubjectAverage[];
  loading?: boolean;
  error?: string | null;
}

function gradeColor(n?: number | null) {
  if (n == null || n <= 0) return 'bg-slate-200 dark:bg-slate-700 text-slate-700';
  if (n >= 5) return 'bg-emerald-500 text-white';
  if (n >= 4) return 'bg-lime-500 text-white';
  if (n >= 3) return 'bg-amber-400 text-slate-900';
  if (n >= 2) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

export function GradesPage({ grades, averages, loading, error }: Props) {
  const [filter, setFilter] = useState('');

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const g of grades) {
      if (g.Tantargy?.Nev) set.add(g.Tantargy.Nev);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'hu'));
  }, [grades]);

  const filtered = useMemo(() => {
    let list = [...grades].sort((a, b) =>
      (b.KeszitesDatuma || '').localeCompare(a.KeszitesDatuma || '')
    );
    if (filter) list = list.filter((g) => g.Tantargy?.Nev === filter);
    return list;
  }, [grades, filter]);

  const avgMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of averages) {
      const name = a.Tantargy?.Nev;
      if (name && typeof a.Atlag === 'number') m.set(name, a.Atlag);
    }
    return m;
  }, [averages]);

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Jegyek</h1>
        <p className="text-sm text-slate-500">{grades.length} értékelés</p>
      </header>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-slate-500">Jegyek betöltése…</p>
      )}

      {subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setFilter('')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${
              !filter
                ? 'bg-[var(--accent)] text-white border-transparent'
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
            }`}
          >
            Mind
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border max-w-[10rem] truncate ${
                filter === s
                  ? 'bg-[var(--accent)] text-white border-transparent'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}
            >
              {s}
              {avgMap.has(s) ? ` · ${avgMap.get(s)!.toFixed(1)}` : ''}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading ? (
        <p className="text-sm text-slate-500 border border-dashed rounded-xl p-4">
          Nincs megjeleníthető jegy.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => (
            <li
              key={g.Uid}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex gap-3"
            >
              <span
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0 ${gradeColor(g.SzamErtek)}`}
              >
                {g.SzamErtek && g.SzamErtek > 0
                  ? g.SzamErtek
                  : (g.SzovegesErtekelesRovidNev || '–').slice(0, 3)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 dark:text-white">
                  {g.Tantargy?.Nev || '—'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {[g.Tema, g.Mod?.Nev, g.Tipus?.Nev].filter(Boolean).join(' · ')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-2">
                  {g.KeszitesDatuma && (
                    <span>{format(parseISO(g.KeszitesDatuma), 'yyyy.MM.dd')}</span>
                  )}
                  {g.ErtekeloTanarNeve && <span>{g.ErtekeloTanarNeve}</span>}
                  {g.SulySzazalekErteke != null && g.SulySzazalekErteke > 0 && (
                    <span>súly: {g.SulySzazalekErteke}%</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
