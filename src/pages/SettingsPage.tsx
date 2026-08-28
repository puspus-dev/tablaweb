import {
  type ThemeMode,
  type Accent,
  ACCENTS,
  loadThemeMode,
  loadAccent,
  saveThemeMode,
  saveAccent,
} from '../lib/theme';
import { useState } from 'react';

interface Props {
  studentName?: string;
  instituteCode?: string;
  onLogout: () => void;
}

export function SettingsPage({ studentName, instituteCode, onLogout }: Props) {
  const [mode, setMode] = useState<ThemeMode>(() => loadThemeMode());
  const [accent, setAccent] = useState<Accent>(() => loadAccent());

  function changeMode(m: ThemeMode) {
    setMode(m);
    saveThemeMode(m);
  }

  function changeAccent(a: Accent) {
    setAccent(a);
    saveAccent(a);
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Beállítások</h1>
      </header>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-1">
        <div className="text-sm text-slate-500">Fiók</div>
        <div className="font-medium text-slate-900 dark:text-white">
          {studentName || '—'}
        </div>
        {instituteCode && (
          <div className="text-xs text-slate-400 font-mono">{instituteCode}</div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Megjelenés
        </h2>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMode(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
                mode === m
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}
            >
              {m === 'system' ? 'Rendszer' : m === 'light' ? 'Világos' : 'Sötét'}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Szín
        </h2>
        <div className="flex gap-3">
          {(Object.keys(ACCENTS) as Accent[]).map((a) => (
            <button
              key={a}
              type="button"
              title={a}
              onClick={() => changeAccent(a)}
              className={`w-9 h-9 rounded-full ring-2 ring-offset-2 dark:ring-offset-slate-900 ${
                accent === a ? 'ring-[var(--accent)]' : 'ring-transparent'
              }`}
              style={{ backgroundColor: ACCENTS[a] }}
            />
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="w-full rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 py-2.5 text-sm font-semibold"
      >
        Kijelentkezés
      </button>

      <p className="text-center text-xs text-slate-400">TáblaWeb · nem hivatalos KRÉTA kliens</p>
    </div>
  );
}
