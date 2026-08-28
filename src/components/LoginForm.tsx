```tsx
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import {
  getAuthorizeUrl,
} from '../api/kreta';

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
  loading = false,
  error = null,
}: Props) {
  const [mode, setMode] =
    useState<'password' | 'oauth'>(
      'oauth'
    );

  const [institutes, setInstitutes] =
    useState<Institute[]>([]);

  const [
    institutesLoading,
    setInstitutesLoading,
  ] = useState(true);

  const [
    institutesError,
    setInstitutesError,
  ] = useState<string | null>(null);

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

  const [oauthLoading, setOauthLoading] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInstitutes() {
      setInstitutesLoading(true);
      setInstitutesError(null);

      try {
        const list =
          await fetchInstitutes();

        if (!cancelled) {
          setInstitutes(list);

          if (list.length === 0) {
            setInstitutesError(
              'Nem sikerült betölteni az intézménylistát.'
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setInstitutesError(
            e instanceof Error
              ? e.message
              : 'Ismeretlen hiba.'
          );
        }
      } finally {
        if (!cancelled) {
          setInstitutesLoading(false);
        }
      }
    }

    loadInstitutes();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    useMemo(
      () =>
        filterInstitutes(
          institutes,
          query
        ),
      [institutes, query]
    );

  function pickInstitute(
    institute: Institute
  ) {
    setSelected(institute);

    setQuery(
      `${institute.name}${
        institute.city
          ? ` (${institute.city})`
          : ''
      }`
    );

    setShowList(false);
  }

  async function handlePassword(
    event: FormEvent
  ) {
    event.preventDefault();

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
   * A régi TáblaWeb login:
   *
   * 1. friss nonce
   * 2. KRÉTA login oldal
   * 3. "Vissza az appba"
   * 4. URL-ben code
   */
  async function startOAuth() {
    if (oauthLoading) {
      return;
    }

    setOauthLoading(true);

    try {
      sessionStorage.setItem(
        'tablaweb_login_pending',
        '1'
      );

      const authorizeUrl =
        await getAuthorizeUrl(
          'tablaweb'
        );

      window.location.assign(
        authorizeUrl
      );
    } catch (e) {
      console.error(
        'KRÉTA OAuth indítási hiba:',
        e
      );

      setOauthLoading(false);

      alert(
        e instanceof Error
          ? e.message
          : 'Nem sikerült megnyitni a KRÉTA bejelentkezést.'
      );
    }
  }

  /**
   * Teljes redirect URL vagy sima code
   * elfogadása.
   */
  async function handleCode(
    event: FormEvent
  ) {
    event.preventDefault();

    let raw =
      code.trim();

    if (!raw) {
      return;
    }

    /**
     * Ha teljes URL-t illesztett be:
     *
     * https://...?...&code=ABC...
     */
    try {
      if (
        raw.includes('code=')
      ) {
        let urlText = raw;

        /**
         * Ha esetleg idézőjel vagy whitespace
         * került köré.
         */
        urlText =
          urlText
            .trim()
            .replace(
              /^["']|["']$/g,
              ''
            );

        const url =
          new URL(urlText);

        const extracted =
          url.searchParams.get(
            'code'
          );

        if (extracted) {
          raw = extracted;
        }
      }
    } catch {
      /**
       * Nem URL.
       * Ilyenkor sima code-ként kezeljük.
       */
    }

    raw = raw.trim();

    if (!raw) {
      return;
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
              setMode('oauth')
            }
            className={`flex-1 rounded-md py-2 font-medium transition ${
              mode === 'oauth'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            KRÉTA oldal
          </button>

          <button
            type="button"
            onClick={() =>
              setMode('password')
            }
            className={`flex-1 rounded-md py-2 font-medium transition ${
              mode === 'password'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            Iskola + jelszó
          </button>
        </div>

        {mode === 'oauth' ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Belépés a KRÉTA oldalon
              </p>

              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                A gomb megnyitja a hivatalos
                KRÉTA bejelentkezési oldalt.
                Bejelentkezés után nyomd meg a
                „Vissza az appba” gombot.
              </p>
            </div>

            <button
              type="button"
              onClick={startOAuth}
              disabled={
                loading ||
                oauthLoading
              }
              className="w-full rounded-xl bg-[var(--accent,#2563eb)] hover:opacity-90 disabled:opacity-60 text-white py-3 text-sm font-semibold"
            >
              {oauthLoading
                ? 'KRÉTA megnyitása…'
                : 'Belépés a KRÉTA oldalon'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>

              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-slate-800 px-3 text-xs text-slate-400">
                  visszatérési kód
                </span>
              </div>
            </div>

            <form
              onSubmit={handleCode}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                KRÉTA visszatérési URL vagy code
              </label>

              <textarea
                rows={4}
                required
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                  )
                }
                placeholder="Illeszd be ide a teljes URL-t, vagy a code= utáni értéket."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                Belépés a kóddal
              </button>
            </form>

            <p className="text-[11px] leading-relaxed text-slate-400 text-center">
              Példa: ha a visszatérési címben
              <br />
              <code className="break-all">
                ?code=ABC123...
              </code>
              <br />
              szerepel, a teljes URL-t is
              bemásolhatod.
            </p>
          </div>
        ) : (
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
                    : 'Iskolakód vagy intézmény neve'
                }
                value={query}
                onChange={(event) => {
                  setQuery(
                    event.target.value
                  );

                  setSelected(null);
                  setShowList(true);
                }}
                onFocus={() =>
                  setShowList(true)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
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
                      (institute) => (
                        <li
                          key={
                            institute.code
                          }
                        >
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onMouseDown={(
                              event
                            ) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              pickInstitute(
                                institute
                              )
                            }
                          >
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                              {
                                institute.name
                              }
                            </div>

                            <div className="text-[11px] text-slate-500">
                              {
                                institute.city
                              }

                              {institute.city
                                ? ' · '
                                : ''}

                              <span className="font-mono">
                                {
                                  institute.code
                                }
                              </span>
                            </div>
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                )}

              {institutesError && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {institutesError}
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
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
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
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2563eb)]"
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
          </form>
        )}
      </div>
    </div>
  );
}
```
