export type ThemeMode = 'system' | 'light' | 'dark';
export type Accent = 'blue' | 'emerald' | 'violet' | 'rose' | 'amber';

const MODE_KEY = 'tablaweb_theme';
const ACCENT_KEY = 'tablaweb_accent';

export const ACCENTS: Record<Accent, string> = {
  blue: '#2563eb',
  emerald: '#059669',
  violet: '#7c3aed',
  rose: '#e11d48',
  amber: '#d97706',
};

export function loadThemeMode(): ThemeMode {
  const v = localStorage.getItem(MODE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

export function saveThemeMode(mode: ThemeMode) {
  localStorage.setItem(MODE_KEY, mode);
  applyTheme(mode, loadAccent());
}

export function loadAccent(): Accent {
  const v = localStorage.getItem(ACCENT_KEY) as Accent | null;
  return v && ACCENTS[v] ? v : 'blue';
}

export function saveAccent(accent: Accent) {
  localStorage.setItem(ACCENT_KEY, accent);
  applyTheme(loadThemeMode(), accent);
}

export function applyTheme(mode: ThemeMode, accent: Accent) {
  const root = document.documentElement;
  const dark =
    mode === 'dark' ||
    (mode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.style.setProperty('--accent', ACCENTS[accent]);
  root.style.setProperty('--accent-fg', '#ffffff');
}
