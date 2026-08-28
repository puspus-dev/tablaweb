export type TabId = 'home' | 'calendar' | 'grades' | 'settings';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Kezdőlap', icon: '🏠' },
  { id: 'calendar', label: 'Órarend', icon: '📅' },
  { id: 'grades', label: 'Jegyek', icon: '📝' },
  { id: 'settings', label: 'Beállítások', icon: '⚙️' },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg flex">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition ${
                isActive
                  ? 'text-[var(--accent)] font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
