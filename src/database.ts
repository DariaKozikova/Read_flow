import { DatabaseSync } from 'node:sqlite';
import schema from '../database/schema.sql?raw';
import type {
  ActiveReading,
  Book,
  CalendarEntry,
  NewBook,
  ReadingPlan,
} from './shared';
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

function validateCover(cover: Uint8Array | null) {
  if (
    cover !== null &&
    (!(cover instanceof Uint8Array) ||
      cover.length > maxBookCoverBytes ||
      !coverType(cover))
  )
    throw new Error('Вибери обкладинку JPG, PNG або WebP до 5 МБ.');
}

function validateReadingTime(entry: ReadingPlan) {
  if (
    !entry ||
    !Number.isSafeInteger(entry.bookId) ||
    entry.bookId < 1 ||
    !Number.isSafeInteger(entry.startsAt) ||
    Math.abs(entry.startsAt) > 8_640_000_000_000_000 ||
    !Number.isInteger(entry.minutes) ||
    entry.minutes < 1 ||
    entry.minutes > 1440
  )
    throw new Error('Перевір книгу, час початку та тривалість читання.');
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
  function getActiveReading() {
    return (
      (db
        .prepare(
          'SELECT book_id AS bookId, start_page AS startPage FROM active_session WHERE id = 1',
        )
        .get() as ActiveReading | undefined) ?? null
    );
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
      validateCover(cover ?? null);
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
    updateBookCover: (id: number, cover: Uint8Array | null) => {
      if (!Number.isSafeInteger(id) || id < 1)
        throw new Error('Некоректна книга.');
      validateCover(cover);
      const row = db
        .prepare(
          `UPDATE books SET cover = ? WHERE id = ? RETURNING ${bookColumns}`,
        )
        .get(cover, id);
      if (!row) throw new Error('Книгу не знайдено.');
      return toBook(row as unknown as BookRow);
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
          `SELECT id, bookId, bookTitle, startsAt, minutes, status FROM (
             SELECT p.id AS id, p.book_id AS bookId, b.title AS bookTitle, p.scheduled_at AS startsAt,
                    p.duration_minutes AS minutes, p.status AS status
             FROM planned_sessions p JOIN books b ON b.id = p.book_id
             WHERE p.scheduled_at >= ? AND p.scheduled_at < ?
             UNION ALL
             SELECT s.id, s.book_id, b.title, s.started_at, s.duration_ms / 60000.0, 'read'
             FROM reading_sessions s JOIN books b ON b.id = s.book_id
             WHERE s.started_at >= ? AND s.started_at < ?
             UNION ALL
             SELECT a.id, a.book_id, b.title, a.started_at, 0, 'reading'
             FROM active_session a JOIN books b ON b.id = a.book_id
             WHERE a.started_at >= ? AND a.started_at < ?
           )
           ORDER BY startsAt, status, id`,
        )
        .all(start, end, start, end, start, end) as unknown as CalendarEntry[];
    },
    getActiveReading,
    startReading: (bookId: number, startPage: number): ActiveReading => {
      if (
        !Number.isSafeInteger(bookId) ||
        !Number.isSafeInteger(startPage) ||
        startPage < 1
      )
        throw new Error('Перевір початкову сторінку.');
      const now = Date.now();
      const result = db
        .prepare(
          `INSERT INTO active_session (id, book_id, state, started_at, start_page, running_since, updated_at)
         SELECT 1, id, 'reading', ?, ?, ?, ? FROM books
         WHERE id = ? AND total_pages >= ? AND NOT EXISTS (SELECT 1 FROM active_session)`,
        )
        .run(now, startPage, now, now, bookId, startPage);
      if (result.changes !== 1)
        throw new Error('Не вдалося розпочати читання.');
      return { bookId, startPage };
    },
    finishReading: (endPage: number) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const session = db
          .prepare(
            `SELECT a.book_id, a.start_page, a.started_at, a.running_since, a.updated_at,
                  a.accumulated_ms, b.total_pages
           FROM active_session a JOIN books b ON b.id = a.book_id WHERE a.id = 1`,
          )
          .get() as
          | {
              book_id: number;
              start_page: number;
              started_at: number;
              running_since: number | null;
              updated_at: number;
              accumulated_ms: number;
              total_pages: number;
            }
          | undefined;
        if (
          !session ||
          !Number.isSafeInteger(endPage) ||
          endPage < session.start_page ||
          endPage > session.total_pages
        )
          throw new Error('Перевір кінцеву сторінку.');
        const end = Math.max(Date.now(), session.updated_at);
        const duration = Math.min(
          end - session.started_at,
          session.accumulated_ms +
            (session.running_since === null ? 0 : end - session.running_since),
        );
        db.prepare(
          'INSERT INTO reading_sessions (book_id, started_at, ended_at, duration_ms, start_page, end_page) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(
          session.book_id,
          session.started_at,
          end,
          duration,
          session.start_page,
          endPage,
        );
        const book = toBook(
          db
            .prepare(
              `UPDATE books SET current_page = ?, status = ? WHERE id = ? RETURNING ${bookColumns}`,
            )
            .get(
              endPage,
              endPage === session.total_pages ? 'finished' : 'reading',
              session.book_id,
            ) as unknown as BookRow,
        );
        db.prepare('DELETE FROM active_session WHERE id = 1').run();
        db.exec('COMMIT');
        return book;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    addReadingPlan: (plan: ReadingPlan) => {
      validateReadingTime(plan);
      db.prepare(
        'INSERT INTO planned_sessions (book_id, scheduled_at, duration_minutes) VALUES (?, ?, ?)',
      ).run(plan.bookId, plan.startsAt, plan.minutes);
    },
    logReadingSession: (session: ReadingPlan) => {
      validateReadingTime(session);
      const duration = session.minutes * 60_000;
      const end = session.startsAt + duration;
      if (end > Date.now()) throw new Error('Сесія читання ще не завершилася.');
      const result = db
        .prepare(
          `INSERT INTO reading_sessions (book_id, started_at, ended_at, duration_ms, start_page, end_page)
           SELECT id, ?, ?, ?, current_page, current_page FROM books WHERE id = ?`,
        )
        .run(session.startsAt, end, duration, session.bookId);
      if (result.changes !== 1) throw new Error('Книгу не знайдено.');
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
