export type BookStatus = 'planned' | 'reading' | 'paused' | 'finished';
export const bookStatusLabels: Record<BookStatus, string> = {
  planned: 'У планах',
  reading: 'Читаю',
  paused: 'На паузі',
  finished: 'Прочитано',
};
export const maxBookCoverBytes = 5 * 1024 * 1024;
export const maxBookDescriptionLength = 5000;
export const bookCoverTypes = ['image/jpeg', 'image/png', 'image/webp'];
export interface Book {
  id: number;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  status: BookStatus;
  coverUrl: string | null;
  description: string;
}
export interface NewBook {
  title: string;
  author: string;
  total_pages: number;
  cover?: Uint8Array;
  description?: string;
}
export type BookDetailsInput = Pick<NewBook, 'title' | 'author'> & {
  status?: BookStatus;
  cover?: Uint8Array | null;
  total_pages?: number;
  description?: string;
};
export interface CalendarEntry {
  id: number;
  bookId: number;
  bookTitle: string;
  startsAt: number;
  minutes: number;
  status: 'read' | 'reading' | 'paused';
  startPage: number;
  endPage: number | null;
}
export interface ActiveReading {
  bookId: number;
  startPage: number;
  accumulatedMs: number;
  runningSince: number | null;
}
export interface ReadingFlowApi {
  getAccount: () => Promise<AccountState>;
  createProfile: (input: ProfileInput) => Promise<AccountState>;
  updateProfile: (input: ProfileInput) => Promise<ProfileInput>;
  setTheme: (theme: Theme) => Promise<void>;
  listBooks: () => Promise<Book[]>;
  addBook: (book: NewBook) => Promise<Book>;
  deleteBook: (id: number) => Promise<void>;
  updateBookCover: (id: number, cover: Uint8Array | null) => Promise<Book>;
  updateBookDetails: (id: number, input: BookDetailsInput) => Promise<Book>;
  listCalendarEntries: (start: number, end: number) => Promise<CalendarEntry[]>;
  listBookSessions: (bookId: number) => Promise<CalendarEntry[]>;
  getActiveReading: () => Promise<ActiveReading | null>;
  startReading: (bookId: number, startPage: number) => Promise<ActiveReading>;
  pauseReading: () => Promise<ActiveReading>;
  resumeReading: () => Promise<ActiveReading>;
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
