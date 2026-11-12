export type PageId = 'home' | 'library' | 'calendar' | 'profile' | 'settings';
export const pages: Record<
  PageId,
  { title: string; subtitle: string; symbol: string }
> = {
  home: {
    title: 'Головна',
    subtitle: 'Твій день у ритмі читання',
    symbol: '⌂',
  },
  library: {
    title: 'Моя бібліотека',
    subtitle: 'Місце для історій, які ти обираєш',
    symbol: '▤',
  },
  calendar: {
    title: 'Календар',
    subtitle: 'Трохи часу для читання щодня',
    symbol: '▦',
  },
  profile: {
    title: 'Мій профіль',
    subtitle: 'Твій власний читацький простір',
    symbol: '♙',
  },
  settings: {
    title: 'Налаштування',
    subtitle: 'ReadingFlow у твоєму стилі',
    symbol: '⚙',
  },
};
export function PlaceholderPage({ page }: { page: PageId }) {
  const info = pages[page];
  return (
    <section className="placeholder" aria-label={info.title}>
      <span
        className="grid place-items-center w-[78px] h-[78px] bg-soft text-accent rounded-[24px] text-[37px] mb-6"
        aria-hidden="true"
      >
        {info.symbol}
      </span>
      <h2>
        Тут буде{' '}
        {page === 'home'
          ? 'твій огляд читання'
          : info.title.toLocaleLowerCase('uk')}
      </h2>
      <p>Цей розділ поки порожній. Наповнимо його наступним кроком.</p>
      <span className="[border:1px_solid_var(--border)] px-3 py-1.25 rounded-[20px] text-[10px] text-muted mt-2">
        Незабаром
      </span>
    </section>
  );
}
