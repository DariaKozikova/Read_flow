const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const schema = fs.readFileSync('database/schema.sql', 'utf8');
function load(file, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const target = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (id) => (id in imports ? imports[id] : require(id)),
    target,
    target.exports,
  );
  return target.exports;
}
const shared = load('src/shared.ts');
const { openDatabase } = load('src/database.ts', {
  './shared': shared,
  '../database/schema.sql?raw': schema,
});
const filename = path.join(
  os.tmpdir(),
  `readingflow-test-${crypto.randomUUID()}.db`,
);
let db;
try {
  const legacy = new DatabaseSync(filename);
  legacy.exec(schema + '\nPRAGMA user_version = 1;');
  legacy
    .prepare('INSERT INTO books (title, total_pages) VALUES (?, ?)')
    .run('Наявна книга', 100);
  legacy.close();
  db = openDatabase(filename);
  assert.equal(db.getAccount().profile, null);
  assert.equal(db.listBooks()[0].title, 'Наявна книга');
  assert.equal(db.listBooks()[0].coverUrl, null);
  assert.throws(() =>
    db.createProfile({ name: ' ', avatar: 'leaf', dailyGoalMinutes: 30 }),
  );
  assert.throws(() =>
    db.createProfile({
      name: 'Дарія',
      avatar: 'invalid',
      dailyGoalMinutes: 30,
    }),
  );
  assert.throws(() =>
    db.createProfile({ name: 'Дарія', avatar: 'moon', dailyGoalMinutes: 0 }),
  );
  assert.throws(() =>
    db.createProfile({ name: 'Дарія', avatar: 'moon', dailyGoalMinutes: 1.5 }),
  );
  const profile = { name: 'Дарія', avatar: 'moon', dailyGoalMinutes: 45 };
  assert.deepEqual(db.createProfile(profile).profile, profile);
  assert.throws(
    () => db.createProfile({ ...profile, name: 'Інший профіль' }),
    /Профіль уже створено/,
  );
  db.setTheme('dark');
  assert.throws(() => db.setTheme('invalid'));
  db.close();
  db = openDatabase(filename);
  assert.deepEqual(db.getAccount(), { profile, theme: 'dark' });
  assert.equal(db.listBooks().length, 1);
  const coverBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDaoAAAAASUVORK5CYII=';
  const coveredBook = {
    title: 'Книга з обкладинкою',
    author: '',
    total_pages: 100,
    cover: Buffer.from(coverBase64, 'base64'),
  };
  assert.throws(() =>
    db.addBook({ ...coveredBook, cover: Buffer.from('bad') }),
  );
  const savedCover = db.addBook(coveredBook);
  assert.equal(savedCover.coverUrl, `data:image/png;base64,${coverBase64}`);
  db.setTheme('light');
  assert.equal(db.getAccount().theme, 'light');
  const bookId = db.listBooks()[1].id;
  const start = Date.UTC(2026, 10, 1);
  const end = Date.UTC(2026, 11, 1);
  assert.throws(() => db.listCalendarEntries(end, start));
  assert.throws(() =>
    db.addReadingPlan({ bookId, startsAt: start, minutes: 0 }),
  );
  assert.throws(() =>
    db.addReadingPlan({ bookId: bookId + 1000, startsAt: start, minutes: 30 }),
  );
  db.addReadingPlan({ bookId, startsAt: start, minutes: 45 });
  db.addReadingPlan({ bookId, startsAt: end, minutes: 30 });
  db.close();
  db = undefined;
  const check = new DatabaseSync(filename);
  assert.equal(check.prepare('PRAGMA user_version').get().user_version, 2);
  assert.equal(
    check.prepare('PRAGMA integrity_check').get().integrity_check,
    'ok',
  );
  check
    .prepare(
      'INSERT INTO reading_sessions (book_id, started_at, ended_at, duration_ms, start_page, end_page) VALUES (?, ?, ?, ?, 0, 5)',
    )
    .run(bookId, start + 60_000, start + 150_000, 90_000);
  check.close();
  db = openDatabase(filename);
  assert.deepEqual(db.listBooks()[0], savedCover);
  const previousBook = db.listBooks()[1];
  assert.throws(() => db.updateBookCover(savedCover.id, Buffer.from('bad')));
  assert.throws(() => db.updateBookCover(99999, null));
  assert.deepEqual(db.updateBookCover(previousBook.id, coveredBook.cover), {
    ...previousBook,
    coverUrl: savedCover.coverUrl,
  });
  assert.deepEqual(db.updateBookCover(savedCover.id, null), {
    ...savedCover,
    coverUrl: null,
  });
  db.close();
  db = openDatabase(filename);
  assert.equal(db.listBooks()[0].coverUrl, null);
  assert.equal(db.listBooks()[1].coverUrl, savedCover.coverUrl);
  assert.ok(
    db
      .listCalendarEntries(start, end)
      .every((entry) => entry.bookId === bookId),
  );
  assert.deepEqual(
    db
      .listCalendarEntries(start, end)
      .map(({ bookTitle, startsAt, minutes, status }) => ({
        bookTitle,
        startsAt,
        minutes,
        status,
      })),
    [
      {
        bookTitle: 'Наявна книга',
        startsAt: start,
        minutes: 45,
        status: 'planned',
      },
      {
        bookTitle: 'Наявна книга',
        startsAt: start + 60_000,
        minutes: 1.5,
        status: 'read',
      },
    ],
  );
  const fresh = openDatabase(':memory:');
  assert.equal(fresh.getAccount().profile, null);
  assert.equal(fresh.info().tables, 7);
  assert.equal(fresh.getAccount().theme, 'system');
  const book = fresh.addBook({
    title: '  Тестова книга  ',
    author: ' Автор ',
    total_pages: 120,
  });
  assert.equal(book.title, 'Тестова книга');
  assert.equal(book.author, 'Автор');
  assert.equal(book.status, 'planned');
  assert.equal(book.current_page, 0);
  assert.throws(() =>
    fresh.addBook({ title: 'Книга', author: '', total_pages: 0 }),
  );
  assert.deepEqual(fresh.listBooks(), [book]);
  const beforeReading = Date.now();
  assert.throws(() => fresh.startReading(book.id, 0));
  const session = fresh.startReading(book.id, 5);
  assert.deepEqual(session, {
    bookId: book.id,
    startPage: 5,
    accumulatedMs: 0,
    runningSince: session.runningSince,
  });
  assert.ok(session.runningSince >= beforeReading);
  assert.throws(() => fresh.startReading(book.id, 6));
  assert.throws(() => fresh.finishReading(4));
  assert.equal(fresh.getActiveReading().startPage, 5);
  const activeEntry = fresh.listCalendarEntries(
    beforeReading,
    Date.now() + 1,
  )[0];
  assert.equal(activeEntry.status, 'reading');
  assert.equal(activeEntry.startPage, 5);
  assert.equal(activeEntry.endPage, null);
  const realNow = Date.now;
  Date.now = () => session.runningSince + 90_000;
  try {
    assert.equal(fresh.finishReading(12).current_page, 12);
  } finally {
    Date.now = realNow;
  }
  assert.equal(fresh.getActiveReading(), null);
  const completedEntry = fresh.listCalendarEntries(
    beforeReading,
    Date.now() + 1,
  )[0];
  assert.equal(completedEntry.status, 'read');
  assert.equal(completedEntry.minutes, 1.5);
  assert.equal(completedEntry.startPage, 5);
  assert.equal(completedEntry.endPage, 12);
  fresh.close();
  console.log(
    'PASS: migration, profile validation and persistence, themes, book creation, and calendar entries.',
  );
} finally {
  db?.close();
  fs.rmSync(filename, { force: true });
}
