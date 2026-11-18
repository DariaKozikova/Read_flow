import { useEffect, useState } from 'react';
import type { AccountState, ProfileInput, Theme } from './shared';
import { AppHeader } from './components/AppHeader';
import { CalendarPage } from './pages/CalendarPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SignInPage } from './pages/SignInPage';
import { ProfilePage } from './pages/ProfilePage';
import { pages, type PageId } from './pages/navigation';
export function App() {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [page, setPage] = useState<PageId>('home');
  const [error, setError] = useState('');
  const [savingTheme, setSavingTheme] = useState(false);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    window.api
      .getAccount()
      .then(setAccount)
      .catch(() => setError('Не вдалося завантажити профіль. Спробуй ще раз.'));
  }, []);
  const theme = account?.theme ?? 'system';
  const resolvedTheme =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);
  async function changeTheme(value: Theme) {
    if (savingTheme) return;
    setSavingTheme(true);
    setError('');
    try {
      await window.api.setTheme(value);
      setAccount((current) =>
        current ? { ...current, theme: value } : current,
      );
    } catch {
      setError('Не вдалося зберегти тему. Спробуй ще раз.');
    } finally {
      setSavingTheme(false);
    }
  }
  async function createProfile(input: ProfileInput) {
    setAccount(await window.api.createProfile(input));
    setSignedIn(true);
  }
  if (!account)
    return (
      <main className="loading" aria-live="polite">
        <div className="brand">ReadingFlow</div>
        <p>{error || 'Відкриваємо твій простір…'}</p>
        {error && (
          <button className="primary-button" onClick={() => location.reload()}>
            Спробувати ще раз
          </button>
        )}
      </main>
    );
  return (
    <>
      {error && (
        <div className="global-error" role="alert">
          {error}
        </div>
      )}
      {!account.profile ? (
        <OnboardingPage
          onCreate={createProfile}
          theme={resolvedTheme}
          onThemeChange={changeTheme}
          savingTheme={savingTheme}
        />
      ) : !signedIn ? (
        <SignInPage
          profile={account.profile}
          onSignIn={() => setSignedIn(true)}
        />
      ) : (
        <div className="min-h-screen">
          <AppHeader
            profile={account.profile}
            page={page}
            onNavigate={setPage}
            theme={resolvedTheme}
            onThemeChange={changeTheme}
            saving={savingTheme}
          />
          <main className="@container mx-auto flex min-w-0 max-w-[1500px] flex-col px-5 py-7 min-[1100px]:px-10">
            <header className="page-header">
              <h1>{pages[page].title}</h1>
            </header>
            {page === 'home' ? (
              <HomePage dailyGoal={account.profile.dailyGoalMinutes} />
            ) : page === 'calendar' ? (
              <CalendarPage dailyGoal={account.profile.dailyGoalMinutes} />
            ) : page === 'library' ? (
              <LibraryPage />
            ) : (
              <ProfilePage
                profile={account.profile}
                onSaved={(profile) =>
                  setAccount((current) => current && { ...current, profile })
                }
              />
            )}
          </main>
        </div>
      )}
    </>
  );
}
