import { DatabaseSync } from 'node:sqlite';
import schema from '../database/schema.sql?raw';
import type { Book, NewBook } from './shared';
import {
  avatars,
  type AccountState,
  type ProfileInput,
  type Theme,
} from './shared';

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
        .prepare(
          'SELECT id, title, author, total_pages, current_page, status FROM books ORDER BY id DESC',
        )
        .all() as unknown as Book[],
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
      const result = db
        .prepare(
          'INSERT INTO books (title, author, total_pages) VALUES (?, ?, ?)',
        )
        .run(input.title.trim(), input.author.trim(), input.total_pages);
      return db
        .prepare(
          'SELECT id, title, author, total_pages, current_page, status FROM books WHERE id = ?',
        )
        .get(result.lastInsertRowid) as unknown as Book;
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
