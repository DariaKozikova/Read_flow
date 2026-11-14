import { DatabaseSync } from 'node:sqlite';
import schema from '../database/schema.sql?raw';
import type { Book, CalendarEntry, NewBook, ReadingPlan } from './shared';
import {
  avatars,
  maxBookCoverBytes,
  type AccountState,
  type ProfileInput,
  type Theme,
} from './shared';

const bookColumns =
  'id, title, author, total_pages, current_page, status, cover';
type BookRow = Omit<Book, 'coverUrl'> & { cover: Uint8Array | null };

function coverType(bytes: Uint8Array) {
  const header = Buffer.from(bytes.subarray(0, 12));
  if (header.subarray(0, 8).toString('hex') === '89504e470d0a1a0a')
    return 'image/png';
  if (header.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (
    header.toString('ascii', 0, 4) === 'RIFF' &&
    header.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
}

function toBook({ cover, ...book }: BookRow): Book {
  const type = cover && coverType(cover);
  return {
    ...book,
    coverUrl:
      cover && type
        ? `data:${type};base64,${Buffer.from(cover).toString('base64')}`
        : null,
  };
}

export function openDatabase(filename: string) {
  const db = new DatabaseSync(filename);
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const version = db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    if (version.user_version > 2)
      throw new Error('Цю базу створено новішою версією ReadingFlow.');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(schema);
      if (version.user_version < 2) {
        db.exec(
          'ALTER TABLE profile ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0, 1));',
        );
      }
      db.exec('PRAGMA user_version = 2;');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    db.close();
    throw error;
  }
  function getAccount(): AccountState {
    const row = db
      .prepare(
        'SELECT name, avatar, daily_goal_minutes, onboarding_completed FROM profile WHERE id = 1',
      )
      .get()!;
    const avatar =
      typeof row.avatar === 'string' &&
      avatars.includes(row.avatar as ProfileInput['avatar'])
        ? (row.avatar as ProfileInput['avatar'])
        : 'leaf';
    return {
      profile:
        row.onboarding_completed === 1
          ? {
              name: String(row.name),
              avatar,
              dailyGoalMinutes: Number(row.daily_goal_minutes),
            }
          : null,
      theme: db.prepare('SELECT theme FROM settings WHERE id = 1').get()!
        .theme as Theme,
    };
  }
  return {
    getAccount,
    createProfile: (input: ProfileInput) => {
      if (
        !input ||
        typeof input.name !== 'string' ||
        !input.name.trim() ||
        input.name.trim().length > 60 ||
        !avatars.includes(input.avatar) ||
        !Number.isInteger(input.dailyGoalMinutes) ||
        input.dailyGoalMinutes < 1 ||
        input.dailyGoalMinutes > 1440
      )
        throw new Error(
          'Вкажи ім’я до 60 символів, аватар і ціль від 1 до 1440 хвилин.',
        );
      const result = db
        .prepare(
          'UPDATE profile SET name = ?, avatar = ?, daily_goal_minutes = ?, onboarding_completed = 1 WHERE id = 1 AND onboarding_completed = 0',
        )
        .run(input.name.trim(), input.avatar, input.dailyGoalMinutes);
      if (result.changes !== 1) throw new Error('Профіль уже створено.');
      return getAccount();
    },
    setTheme: (theme: Theme) => {
      if (!['light', 'dark', 'system'].includes(theme))
        throw new Error('Невідома тема.');
      db.prepare('UPDATE settings SET theme = ? WHERE id = 1').run(theme);
    },
    close: () => db.close(),
    listBooks: () =>
      db
        .prepare(`SELECT ${bookColumns} FROM books ORDER BY id DESC`)
        .all()
        .map((row) => toBook(row as unknown as BookRow)),
    addBook: (input: NewBook) => {
      if (
        !input ||
        typeof input.title !== 'string' ||
        !input.title.trim() ||
        input.title.trim().length > 300 ||
        typeof input.author !== 'string' ||
        input.author.length > 300 ||
        !Number.isSafeInteger(input.total_pages) ||
        input.total_pages < 1 ||
        input.total_pages > 1000000
      ) {
        throw new Error(
          'Перевір назву, автора та кількість сторінок (від 1 до 1 000 000).',
        );
      }
      const { cover } = input;
      if (
        cover !== undefined &&
        (!(cover instanceof Uint8Array) ||
          cover.length > maxBookCoverBytes ||
          !coverType(cover))
      )
        throw new Error('Вибери обкладинку JPG, PNG або WebP до 5 МБ.');
      const result = db
        .prepare(
          'INSERT INTO books (title, author, total_pages, cover) VALUES (?, ?, ?, ?)',
        )
        .run(
          input.title.trim(),
          input.author.trim(),
          input.total_pages,
          cover ?? null,
        );
      return toBook(
        db
          .prepare(`SELECT ${bookColumns} FROM books WHERE id = ?`)
          .get(result.lastInsertRowid) as unknown as BookRow,
      );
    },
    listCalendarEntries: (start: number, end: number) => {
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start >= end
      )
        throw new Error('Некоректний діапазон календаря.');
      return db
        .prepare(
          `SELECT id, bookTitle, startsAt, minutes, status FROM (
             SELECT p.id AS id, b.title AS bookTitle, p.scheduled_at AS startsAt,
                    p.duration_minutes AS minutes, p.status AS status
             FROM planned_sessions p JOIN books b ON b.id = p.book_id
             WHERE p.scheduled_at >= ? AND p.scheduled_at < ?
             UNION ALL
             SELECT s.id, b.title, s.started_at, s.duration_ms / 60000.0, 'read'
             FROM reading_sessions s JOIN books b ON b.id = s.book_id
             WHERE s.started_at >= ? AND s.started_at < ?
           )
           ORDER BY startsAt, status, id`,
        )
        .all(start, end, start, end) as unknown as CalendarEntry[];
    },
    addReadingPlan: (plan: ReadingPlan) => {
      if (
        !plan ||
        !Number.isSafeInteger(plan.bookId) ||
        plan.bookId < 1 ||
        !Number.isSafeInteger(plan.startsAt) ||
        Math.abs(plan.startsAt) > 8_640_000_000_000_000 ||
        !Number.isInteger(plan.minutes) ||
        plan.minutes < 1 ||
        plan.minutes > 1440
      )
        throw new Error('Перевір книгу, час початку та тривалість читання.');
      db.prepare(
        'INSERT INTO planned_sessions (book_id, scheduled_at, duration_minutes) VALUES (?, ?, ?)',
      ).run(plan.bookId, plan.startsAt, plan.minutes);
    },
    info: () => ({
      path: filename,
      tables: Number(
        db
          .prepare(
            "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
          )
          .get()!.count,
      ),
    }),
  };
}
