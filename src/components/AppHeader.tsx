import { Avatar } from './Avatar';
import { ThemePicker } from './ThemePicker';
import { pages, type PageId } from '../pages/navigation';
import type { ProfileInput, Theme } from '../shared';

const sections = ['home', 'library', 'calendar'] as const;

export function AppHeader({
  profile,
  page,
  onNavigate,
  theme,
  onThemeChange,
  saving,
}: {
  profile: ProfileInput;
  page: PageId;
  onNavigate: (page: PageId) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  saving: boolean;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-8 gap-y-2 px-5 py-2.5 min-[1100px]:px-10">
        <button
          type="button"
          className="brand border-0 bg-transparent p-0 text-accent"
          onClick={() => onNavigate('home')}
        >
          <span className="brand-mark" aria-hidden="true">
            ▥
          </span>
          ReadingFlow
        </button>
        <nav
          className="flex flex-wrap items-center gap-x-5"
          aria-label="Основна навігація"
        >
          {sections.map((id) => (
            <button
              key={id}
              type="button"
              className="border-0 border-b-2 border-solid border-transparent bg-transparent px-0 py-2 font-semibold hover:text-accent aria-[current=page]:border-accent aria-[current=page]:text-accent"
              aria-current={page === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              {pages[id].title}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <ThemePicker
            value={theme}
            onChange={onThemeChange}
            disabled={saving}
          />
          <button
            type="button"
            className="rounded-[50%] border-2 border-transparent bg-transparent p-0 hover:border-accent aria-[current=page]:border-accent"
            aria-label="Мій профіль"
            title="Мій профіль"
            aria-current={page === 'profile' ? 'page' : undefined}
            onClick={() => onNavigate('profile')}
          >
            <Avatar value={profile.avatar} />
          </button>
        </div>
      </div>
    </header>
  );
}
