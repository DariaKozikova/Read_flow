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
      <span className="placeholder-icon" aria-hidden="true">
        {info.symbol}
      </span>
      <h2>
        Тут буде{' '}
        {page === 'home'
          ? 'твій огляд читання'
          : info.title.toLocaleLowerCase('uk')}
      </h2>
      <p>Цей розділ поки порожній. Наповнимо його наступним кроком.</p>
      <span className="quiet-tag">Незабаром</span>
    </section>
  );
}
