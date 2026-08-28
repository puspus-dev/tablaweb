import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { getAuthorizeUrl } from '../api/kreta';

import {
  fetchInstitutes,
  filterInstitutes,
  resolveInstituteCode,
  type Institute,
} from '../api/institutes';

interface Props {
  onPasswordLogin: (
    instituteCode: string,
    username: string,
    password: string
  ) => Promise<void>;

  onCodeLogin: (
    code: string
  ) => Promise<void>;

  loading?: boolean;

  error?: string | null;
}

export function LoginForm({
  onPasswordLogin,
  onCodeLogin,
  loading,
  error,
}: Props) {
  const [mode, setMode] =
    useState<'password' | 'oauth'>(
      'password'
    );

  const [institutes, setInstitutes] =
    useState<Institute[]>([]);

  const [institutesLoading, setInstitutesLoading] =
    useState(true);

  const [institutesError, setInstitutesError] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState('');

  const [selected, setSelected] =
    useState<Institute | null>(null);

  const [showList, setShowList] =
    useState(false);

  const [username, setUsername] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [code, setCode] =
    useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setInstitutesLoading(true);
      setInstitutesError(null);

      try {
        const list =
          await fetchInstitutes();

        if (!cancelled) {
          setInstitutes(list);

          if (list.length === 0) {
            setInstitutesError(
              'Nem sikerült betölteni az intézménylistát. Írd be kézzel az iskolakódot, vagy használd a KRÉTA belépést.'
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setInstitutesError(
            (e as Error).message
          );
        }
      } finally {
        if (!cancelled) {
          setInstitutesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      filterInstitutes(
        institutes,
        query
      ),
    [institutes, query]
  );

  function pickInstitute(
    inst: Institute
  ) {
    setSelected(inst);

    setQuery(
      `${inst.name}${
        inst.city
          ? ` (${inst.city})`
          : ''
      }`
    );

    setShowList(false);
  }

  async function handlePassword(
    e: FormEvent
  ) {
    e.preventDefault();

    const instituteCode =
      resolveInstituteCode(
        selected,
        query
      );

    if (!instituteCode) {
      return;
    }

    await onPasswordLogin(
      instituteCode,
      username.trim(),
      password
    );
  }

  /**
   * KRÉTA OAuth indítása.
   *
   * A getAuthorizeUrl() most már előbb
   * friss nonce-t kér az IDP-től, ezért
   * ezt await-elni kell.
   */
  async function startOAuth() {
    sessionStorage.setItem(
      'tablaweb_login_pending',
      '1'
    );

    try {
      const authorizeUrl =
        await getAuthorizeUrl(
          'tablaweb'
        );

      window.location.href =
        authorizeUrl;
    } catch (e) {
      console.error(
        'KRÉTA OAuth indítási hiba:',
        e
      );

      // A meglévő error propot nem tudjuk
      // innen módosítani, ezért legalább
      // a konzolban megjelenik a hiba.
      alert(
        `Nem sikerült elindítani a KRÉTA belépést: ${
          (e as Error).message
        }`
      );
    }
  }

  async function handleCode(
    e: FormEvent
  ) {
    e.preventDefault();

    let raw = code.trim();

    try {
      if (raw.includes('code=')) {
        const u = new URL(raw);

        raw =
          u.searchParams.get(
            'code'
          ) || raw;
      }
    } catch {
      /* plain */
    }

    await onCodeLogin(raw);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            TáblaWeb
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Webes KRÉTA napló
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm p-3">
            {error}
          </div>
        )}

        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 text-sm">
          <button
            type="button"
            onClick={() =>
              setMode('password')
            }
            className={`flex-1 rounded-md py-1.5 font-medium transition ${
              mode === 'password'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            Iskola + jelszó
          </button>

          <button
            type="button"
            onClick={() =>
              setMode('oauth')
            }
            className={`flex-1 rounded-md py-1.5 font-medium transition ${
              mode === 'oauth'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            KRÉTA oldal
          </button>
        </div>

        {mode === 'password' ? (
          <form
            onSubmit={handlePassword}
            className="space-y-3"
          >
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Intézmény
              </label>

              <input
                type="text"
                required
                autoComplete="organization"
                placeholder={
                  institutesLoading
                    ? 'Intézmények betöltése…'
                    : 'Iskolakód VAGY keresés név szerint'
                }
                value={query}
                onChange={(e) => {
                  setQuery(
                    e.target.value
                  );

                  setSelected(null);
                  setShowList(true);
                }}
                onFocus={() =>
                  setShowList(true)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
              />

              {selected && (
                <p className="mt-1 text-[11px] text-slate-400 font-mono">
                  {selected.code}
                  {selected.city
                    ? ` · ${selected.city}`
                    : ''}
                </p>
              )}

              {showList &&
                filtered.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg text-sm">
                    {filtered.map(
                      (inst) => (
                        <li key={inst.code}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onMouseDown={(
                              e
                            ) =>
                              e.preventDefault()
                            }
                            onClick={() =>
                              pickInstitute(
                                inst
                              )
                            }
                          >
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                              {inst.name}
                            </div>

                            <div className="text-[11px] text-slate-500">
                              {inst.city}

                              {inst.city
                                ? ' · '
                                : ''}

                              <span className="font-mono">
                                {
                                  inst.code
                                }
                              </span>
                            </div>
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                )}

              {(institutesError ||
                (!institutesLoading &&
                  institutes.length ===
                    0)) && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {institutesError ||
                    'A lista most nem elérhető (KRÉTA szerver). Írd be kézzel az iskolakódot (pl. klik…).'}
                </p>
              )}
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Felhasználónév
              </span>

              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Jelszó
              </span>

              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent,#2563eb)] hover:opacity-90 disabled:opacity-60 text-white py-3 text-sm font-semibold"
            >
              {loading
                ? 'Belépés…'
                : 'Belépés'}
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              Ha{' '}
              <code>
                unauthorized_client
              </code>{' '}
              hibát kapsz, használd a
              „KRÉTA oldal” fület.
            </p>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              A hivatalos KRÉTA belépő
              oldalra visz. Utána a
              redirect URL-t / kódot illeszd
              be ide (tartalék mód, ha a
              jelszavas belépés nem
              engedélyezett).
            </p>

            <button
              type="button"
              onClick={startOAuth}
              disabled={loading}
              className="w-full rounded-xl border border-[var(--accent,#2563eb)] text-[var(--accent,#2563eb)] py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              KRÉTA belépő megnyitása
            </button>

            <form
              onSubmit={handleCode}
              className="space-y-2"
            >
              <textarea
                required
                rows={3}
                placeholder="code=... vagy a teljes redirect URL"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                Belépés kóddal
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}