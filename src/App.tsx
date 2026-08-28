import { useCallback, useEffect, useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { WeekCalendar } from './components/WeekCalendar';
import { BottomNav, type TabId } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { GradesPage } from './pages/GradesPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  login,
  loginWithCode,
  refreshAccessToken,
  instituteFromToken,
  fetchGrades,
  fetchSubjectAverages,
} from './api/kreta';
import { loadCalendarData } from './lib/calendarData';
import {
  saveAuth,
  loadAuth,
  clearAuth,
  isTokenValid,
} from './lib/authStorage';
import { applyTheme, loadThemeMode, loadAccent } from './lib/theme';
import type { StoredAuth, KretaGrade, SubjectAverage } from './types/kreta';
import type { CalendarEvent } from './types/calendar';

export default function App() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [grades, setGrades] = useState<KretaGrade[]>([]);
  const [averages, setAverages] = useState<SubjectAverage[]>([]);
  const [tab, setTab] = useState<TabId>('home');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [gradesError, setGradesError] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(loadThemeMode(), loadAccent());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(loadThemeMode(), loadAccent());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // OAuth callback: /#/auth?code=... vagy ?code= a gyökéren
  useEffect(() => {
    async function handleHashAuth() {
      const hash = window.location.hash; // #/auth?code=
      const search = window.location.search;
      let code: string | null = null;
      if (hash.startsWith('#/auth')) {
        const q = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
        code = new URLSearchParams(q).get('code');
      }
      if (!code && search) {
        code = new URLSearchParams(search).get('code');
      }
      if (!code) return;

      setLoginLoading(true);
      setError(null);
      try {
        await completeCodeLogin(code);
        // URL tisztítás
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoginLoading(false);
      }
    }
    handleHashAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGrades = useCallback(async (current: StoredAuth) => {
    setGradesLoading(true);
    setGradesError(null);
    try {
      let tokenAuth = current;
      if (!isTokenValid(current)) {
        const refreshed = await refreshAccessToken(
          current.instituteCode,
          current.refreshToken
        );
        tokenAuth = {
          ...current,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || current.refreshToken,
          expiresAt: Date.now() + refreshed.expires_in * 1000,
        };
        saveAuth(tokenAuth);
        setAuth(tokenAuth);
      }
      const [g, a] = await Promise.all([
        fetchGrades(tokenAuth.instituteCode, tokenAuth.accessToken),
        fetchSubjectAverages(tokenAuth.instituteCode, tokenAuth.accessToken),
      ]);
      setGrades(g);
      setAverages(a);
    } catch (e) {
      setGradesError((e as Error).message);
    } finally {
      setGradesLoading(false);
    }
  }, []);

  const refreshData = useCallback(
    async (current: StoredAuth) => {
      setRefreshing(true);
      setLoadErrors([]);
      try {
        let tokenAuth = current;
        if (!isTokenValid(current)) {
          const refreshed = await refreshAccessToken(
            current.instituteCode,
            current.refreshToken
          );
          tokenAuth = {
            ...current,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token || current.refreshToken,
            expiresAt: Date.now() + refreshed.expires_in * 1000,
          };
          saveAuth(tokenAuth);
          setAuth(tokenAuth);
        }

        const result = await loadCalendarData(tokenAuth);
        setEvents(result.events);
        setLoadErrors(result.errors);

        if (result.studentName && result.studentName !== tokenAuth.studentName) {
          const updated = { ...tokenAuth, studentName: result.studentName };
          saveAuth(updated);
          setAuth(updated);
        }

        await loadGrades(tokenAuth);
      } catch (e) {
        setLoadErrors([(e as Error).message]);
      } finally {
        setRefreshing(false);
      }
    },
    [loadGrades]
  );

  useEffect(() => {
    async function init() {
      const stored = loadAuth();
      if (stored) {
        setAuth(stored);
        await refreshData(stored);
      }
      setLoading(false);
    }
    init();
  }, [refreshData]);

  async function completeCodeLogin(code: string) {
    const tokens = await loginWithCode(code);
    const fromJwt = instituteFromToken(tokens.access_token);
    if (!fromJwt) {
      throw new Error(
        'Nem sikerült kiolvasni az iskolakódot a tokenből. Próbáld újra.'
      );
    }
    const stored: StoredAuth = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      instituteCode: fromJwt,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    saveAuth(stored);
    setAuth(stored);
    sessionStorage.removeItem('tablaweb_login_pending');
    await refreshData(stored);
  }


  async function handlePasswordLogin(
    instituteCode: string,
    username: string,
    password: string
  ) {
    setLoginLoading(true);
    setError(null);
    try {
      const tokens = await login({ instituteCode, username, password });
      const stored: StoredAuth = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        instituteCode,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };
      saveAuth(stored);
      setAuth(stored);
      await refreshData(stored);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleCodeLogin(code: string) {
    setLoginLoading(true);
    setError(null);
    try {
      await completeCodeLogin(code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    setAuth(null);
    setEvents([]);
    setGrades([]);
    setAverages([]);
    setLoadErrors([]);
    setTab('home');
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-slate-500">
        Betöltés…
      </div>
    );
  }

  if (!auth) {
    return (
      <LoginForm
        onPasswordLogin={handlePasswordLogin}
        onCodeLogin={handleCodeLogin}
        loading={loginLoading}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <main className="mx-auto max-w-lg px-4 pt-4 pb-24">
        {tab === 'home' && (
          <HomePage
            events={events}
            grades={grades}
            studentName={auth.studentName}
            onRefresh={() => refreshData(auth)}
            refreshing={refreshing}
          />
        )}
        {tab === 'calendar' && (
          <WeekCalendar
            events={events}
            studentName={auth.studentName}
            onRefresh={() => refreshData(auth)}
            refreshing={refreshing}
            errors={loadErrors}
          />
        )}
        {tab === 'grades' && (
          <GradesPage
            grades={grades}
            averages={averages}
            loading={gradesLoading}
            error={gradesError}
          />
        )}
        {tab === 'settings' && (
          <SettingsPage
            studentName={auth.studentName}
            instituteCode={auth.instituteCode}
            onLogout={handleLogout}
          />
        )}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
