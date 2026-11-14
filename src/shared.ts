export type BookStatus = 'planned' | 'reading' | 'paused' | 'finished';
export const maxBookCoverBytes = 5 * 1024 * 1024;
export const bookCoverTypes = ['image/jpeg', 'image/png', 'image/webp'];
export interface Book {
  id: number;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  status: BookStatus;
  coverUrl: string | null;
}
export interface NewBook {
  title: string;
  author: string;
  total_pages: number;
  cover?: Uint8Array;
}
export interface CalendarEntry {
  id: number;
  bookId: number;
  bookTitle: string;
  startsAt: number;
  minutes: number;
  status: 'planned' | 'completed' | 'cancelled' | 'read' | 'reading';
}
export interface ActiveReading {
  bookId: number;
  startPage: number;
}
export interface ReadingPlan {
  bookId: number;
  startsAt: number;
  minutes: number;
}
export interface ReadingFlowApi {
  getAccount: () => Promise<AccountState>;
  createProfile: (input: ProfileInput) => Promise<AccountState>;
  setTheme: (theme: Theme) => Promise<void>;
  listBooks: () => Promise<Book[]>;
  addBook: (book: NewBook) => Promise<Book>;
  updateBookCover: (id: number, cover: Uint8Array | null) => Promise<Book>;
  listCalendarEntries: (start: number, end: number) => Promise<CalendarEntry[]>;
  addReadingPlan: (plan: ReadingPlan) => Promise<void>;
  logReadingSession: (session: ReadingPlan) => Promise<void>;
  getActiveReading: () => Promise<ActiveReading | null>;
  startReading: (bookId: number, startPage: number) => Promise<ActiveReading>;
  finishReading: (endPage: number) => Promise<Book>;
  databaseInfo: () => Promise<{ path: string; tables: number }>;
}
export type Theme = 'light' | 'dark' | 'system';
export const avatars = [
  'leaf',
  'moon',
  'sun',
  'flower',
  'book',
  'star',
] as const;
export type Avatar = (typeof avatars)[number];
export interface ProfileInput {
  name: string;
  avatar: Avatar;
  dailyGoalMinutes: number;
}
export interface AccountState {
  profile: ProfileInput | null;
  theme: Theme;
}
