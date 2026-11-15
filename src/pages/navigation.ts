export type PageId = 'home' | 'library' | 'calendar' | 'profile';

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
};
