import { useEffect, useState } from 'react';
import type { AccountState, ProfileInput, Theme } from './shared';
import { Sidebar } from './components/Sidebar';
import { CalendarPage } from './pages/CalendarPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SignInPage } from './pages/SignInPage';
import { ProfilePage } from './pages/ProfilePage';
import { pages, PlaceholderPage, type PageId } from './pages/PlaceholderPage';
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
        <div className="grid grid-cols-[245px_1fr] min-h-screen narrow:grid-cols-[195px_1fr]">
          <Sidebar
            profile={account.profile}
            page={page}
            onNavigate={setPage}
            theme={resolvedTheme}
            onThemeChange={changeTheme}
            saving={savingTheme}
          />
          <main className="[padding:45px_48px_24px] flex flex-col min-w-0 compact:px-6.25 compact:py-8.75 narrow:px-5 narrow:py-7.5">
            <header className="page-header">
              <div>
                <p className="eyebrow">ТВІЙ ЧИТАЦЬКИЙ ЩОДЕННИК</p>
                <h1>{pages[page].title}</h1>
                <p>{pages[page].subtitle}</p>
              </div>
              <span className="[border:1px_solid_var(--border)] px-3 py-1.75 rounded-[20px] text-muted text-[10px] whitespace-nowrap compact:hidden">
                Твій власний темп
              </span>
            </header>
            {page === 'home' ? (
              <HomePage dailyGoal={account.profile.dailyGoalMinutes} />
            ) : page === 'calendar' ? (
              <CalendarPage dailyGoal={account.profile.dailyGoalMinutes} />
            ) : page === 'library' ? (
              <LibraryPage />
            ) : page === 'profile' ? (
              <ProfilePage
                profile={account.profile}
                onSaved={(profile) =>
                  setAccount((current) => current && { ...current, profile })
                }
              />
            ) : (
              <PlaceholderPage page={page} />
            )}
            <footer className="workspace-footer">
              ReadingFlow <span>Маленькі кроки. Великі історії.</span>
            </footer>
          </main>
        </div>
      )}
    </>
  );
}
