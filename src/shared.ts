export type BookStatus = 'planned' | 'reading' | 'paused' | 'finished';
export interface Book {
  id: number;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  status: BookStatus;
}
export interface NewBook {
  title: string;
  author: string;
  total_pages: number;
}
export interface ReadingFlowApi {
  getAccount: () => Promise<AccountState>;
  createProfile: (input: ProfileInput) => Promise<AccountState>;
  setTheme: (theme: Theme) => Promise<void>;
  listBooks: () => Promise<Book[]>;
  addBook: (book: NewBook) => Promise<Book>;
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
