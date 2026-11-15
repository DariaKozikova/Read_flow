import { Avatar } from './Avatar';
import { ThemePicker } from './ThemePicker';
import { pages, type PageId } from '../pages/navigation';
import type { ProfileInput, Theme } from '../shared';
export function Sidebar({
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
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">▥</span>
        <div>
          ReadingFlow<small>Час для нової історії</small>
        </div>
      </div>
      <p className="text-[9px] tracking-[1.7px] [margin:49px_14px_14px]">
        ТВІЙ ПРОСТІР
      </p>
      <nav aria-label="Основна навігація">
        {(Object.keys(pages) as PageId[]).map((id) => (
          <button
            key={id}
            className={`nav-item ${page === id ? 'active' : ''}`}
            aria-current={page === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <span aria-hidden="true">{pages[id].symbol}</span>
            {pages[id].title}
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-6">
        <ThemePicker value={theme} onChange={onThemeChange} disabled={saving} />
        <div className="sidebar-profile">
          <Avatar value={profile.avatar} />
          <div>
            <strong>{profile.name}</strong>
            <small>Ціль · {profile.dailyGoalMinutes} хв / день</small>
          </div>
          <span
            className="w-1.5 h-1.5 bg-accent rounded-[50%] ml-auto shrink-0"
            aria-label="Локальний профіль"
          />
        </div>
        <p className="text-[9px] [margin:12px_0_0] text-center">
          Твій профіль на цьому пристрої
        </p>
      </div>
    </aside>
  );
}
