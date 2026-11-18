export type PageId = 'home' | 'library' | 'calendar' | 'profile';

export const pages: Record<PageId, { title: string }> = {
  home: {
    title: 'Головна',
  },
  library: {
    title: 'Моя бібліотека',
  },
  calendar: {
    title: 'Календар',
  },
  profile: {
    title: 'Мій профіль',
  },
};
