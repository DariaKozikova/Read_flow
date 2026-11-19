const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { compileFunction } = require('node:vm');
const schema = fs.readFileSync('database/schema.sql', 'utf8');
function load(file, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const target = { exports: {} };
  compileFunction(source, ['require', 'module', 'exports'], {
    filename: path.resolve(file),
  })(
    (id) => (id in imports ? imports[id] : require(id)),
    target,
    target.exports,
  );
  return target.exports;
}
const shared = load('src/shared.ts');
const { summarizeReading } = load('src/readingSummary.ts');
const firstDay = new Date(2026, 10, 10, 12).getTime();
const nextDay = new Date(2026, 10, 11, 12).getTime();
assert.deepEqual(
  summarizeReading([
    {
      bookId: 1,
      startsAt: firstDay,
      minutes: 10,
      status: 'read',
      startPage: 1,
      endPage: 11,
    },
    {
      bookId: 1,
      startsAt: firstDay + 3_600_000,
      minutes: 5,
      status: 'read',
      startPage: 11,
      endPage: 16,
    },
    {
      bookId: 2,
      startsAt: nextDay,
      minutes: 7.5,
      status: 'read',
      startPage: 5,
      endPage: 5,
    },
    {
      bookId: 3,
      startsAt: firstDay - 86_400_000,
      minutes: 2,
      status: 'paused',
      startPage: 1,
      endPage: null,
    },
  ]),
  { milliseconds: 1_350_000, pages: 15, bookCount: 2, dayCount: 2 },
);
assert.deepEqual(summarizeReading([]), {
  milliseconds: 0,
  pages: 0,
  bookCount: 0,
  dayCount: 0,
});
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
  assert.equal(db.listBooks()[0].description, '');
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
  assert.throws(() => db.updateProfile({ ...profile, name: ' ' }));
  assert.throws(() => db.updateProfile({ ...profile, dailyGoalMinutes: 0 }));
  assert.throws(() => db.updateProfile({ ...profile, avatar: 'invalid' }));
  const updatedProfile = {
    avatar: 'flower',
    name: 'Дарія К.',
    dailyGoalMinutes: 60,
  };
  assert.deepEqual(
    db.updateProfile({ ...updatedProfile, name: ' Дарія К. ' }),
    updatedProfile,
  );
  assert.equal(db.listBooks().length, 1);
  const coverBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDaoAAAAASUVORK5CYII=';
  const coveredBook = {
    title: 'Книга з обкладинкою',
    author: '',
    total_pages: 100,
    cover: Buffer.from(coverBase64, 'base64'),
    description: 'Опис книги\nДругий рядок',
  };
  assert.throws(() =>
    db.addBook({ ...coveredBook, cover: Buffer.from('bad') }),
  );
  const savedCover = db.addBook(coveredBook);
  assert.equal(savedCover.coverUrl, `data:image/png;base64,${coverBase64}`);
  assert.equal(savedCover.description, coveredBook.description);
  db.setTheme('light');
  assert.equal(db.getAccount().theme, 'light');
  const bookId = db.listBooks()[1].id;
  const start = Date.UTC(2026, 10, 1);
  const end = Date.UTC(2026, 11, 1);
  assert.throws(() => db.listCalendarEntries(end, start));
  db.close();
  db = undefined;
  const check = new DatabaseSync(filename);
  check
    .prepare(
      'INSERT INTO planned_sessions (book_id, scheduled_at, duration_minutes) VALUES (?, ?, ?)',
    )
    .run(bookId, start, 45);
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
  assert.deepEqual(db.getAccount(), {
    profile: updatedProfile,
    theme: 'light',
  });
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
        startsAt: start + 60_000,
        minutes: 1.5,
        status: 'read',
      },
    ],
  );
  const fresh = openDatabase(':memory:');
  assert.equal(fresh.getAccount().profile, null);
  assert.throws(() => fresh.updateProfile(updatedProfile));
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
  assert.throws(() =>
    fresh.updateBookDetails(book.id, { title: ' ', author: '' }),
  );
  assert.throws(() =>
    fresh.updateBookDetails(book.id, { title: 'a'.repeat(301), author: '' }),
  );
  assert.throws(() =>
    fresh.updateBookDetails(99999, { title: 'Книга', author: '' }),
  );
  const edited = fresh.updateBookDetails(book.id, {
    title: ' Нова назва ',
    author: ' Новий автор ',
  });
  assert.deepEqual(edited, {
    ...book,
    title: 'Нова назва',
    author: 'Новий автор',
  });
  assert.deepEqual(fresh.listBooks(), [edited]);
  assert.throws(() =>
    fresh.updateBookDetails(book.id, {
      title: edited.title,
      author: edited.author,
      description: 'a'.repeat(5001),
    }),
  );
  assert.equal(fresh.listBooks()[0].description, '');
  const described = fresh.updateBookDetails(book.id, {
    title: edited.title,
    author: edited.author,
    description: ' Опис\nДругий рядок ',
  });
  assert.equal(described.description, 'Опис\nДругий рядок');
  assert.equal(
    fresh.updateBookDetails(book.id, {
      title: edited.title,
      author: edited.author,
    }).description,
    described.description,
  );
  fresh.updateBookDetails(book.id, {
    title: edited.title,
    author: edited.author,
    description: '',
  });
  assert.throws(() =>
    fresh.updateBookDetails(book.id, {
      title: 'Невдала зміна',
      author: '',
      cover: Buffer.from('bad'),
    }),
  );
  assert.deepEqual(fresh.listBooks(), [edited]);
  const withCover = fresh.updateBookDetails(book.id, {
    title: edited.title,
    author: edited.author,
    cover: coveredBook.cover,
  });
  assert.equal(withCover.coverUrl, savedCover.coverUrl);
  assert.equal(
    fresh.updateBookDetails(book.id, {
      title: edited.title,
      author: edited.author,
    }).coverUrl,
    withCover.coverUrl,
  );
  assert.equal(
    fresh.updateBookDetails(book.id, {
      title: edited.title,
      author: edited.author,
      cover: null,
    }).coverUrl,
    null,
  );
  const beforeReading = Date.now();
  assert.deepEqual(fresh.listBookNotes(book.id), []);
  assert.throws(() =>
    fresh.addBookNote(book.id, { content: ' ', pageNumber: null }),
  );
  assert.throws(() =>
    fresh.addBookNote(book.id, { content: 'Текст', pageNumber: 121 }),
  );
  assert.throws(() =>
    fresh.addBookNote(99999, { content: 'Текст', pageNumber: null }),
  );
  const note = fresh.addBookNote(book.id, {
    content: ' Перша думка\nДругий рядок ',
    pageNumber: 5,
  });
  assert.equal(note.content, 'Перша думка\nДругий рядок');
  assert.equal(note.pageNumber, 5);
  assert.deepEqual(fresh.listBookNotes(book.id), [note]);
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
  let elapsed = 30_000;
  Date.now = () => session.runningSince + elapsed;
  try {
    const paused = fresh.pauseReading();
    assert.equal(paused.accumulatedMs, 30_000);
    assert.equal(paused.runningSince, null);
    assert.throws(() => fresh.pauseReading());
    assert.equal(
      fresh.listCalendarEntries(beforeReading, Date.now())[0].status,
      'paused',
    );
    elapsed += 120_000;
    const resumed = fresh.resumeReading();
    assert.equal(resumed.runningSince, Date.now());
    assert.equal(resumed.accumulatedMs, 30_000);
    assert.throws(() => fresh.resumeReading());
    elapsed += 60_000;
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
  assert.deepEqual(fresh.listBookSessions(book.id), [completedEntry]);
  assert.deepEqual(fresh.listBookSessions(99999), []);
  assert.throws(() => fresh.listBookSessions(0));
  assert.deepEqual(
    fresh.listCalendarEntries(beforeReading - 1, beforeReading),
    [],
  );
  fresh.startReading(book.id, 12);
  assert.throws(() => fresh.finishReading(121));
  const finishedBook = fresh.finishReading(120);
  assert.equal(finishedBook.current_page, 120);
  assert.equal(finishedBook.status, 'finished');
  for (const total_pages of [0, 1.5, 1000001, 119]) {
    assert.throws(() =>
      fresh.updateBookDetails(book.id, {
        title: 'Не зберігати',
        author: '',
        total_pages,
      }),
    );
  }
  assert.deepEqual(fresh.listBooks(), [finishedBook]);
  const expanded = fresh.updateBookDetails(book.id, {
    title: finishedBook.title,
    author: finishedBook.author,
    total_pages: 150,
  });
  assert.equal(expanded.total_pages, 150);
  assert.equal(expanded.status, 'reading');
  fresh.startReading(book.id, 140);
  assert.throws(() =>
    fresh.updateBookDetails(book.id, {
      title: expanded.title,
      author: expanded.author,
      total_pages: 130,
    }),
  );
  fresh.finishReading(140);
  const resized = fresh.updateBookDetails(book.id, {
    title: expanded.title,
    author: expanded.author,
    total_pages: 140,
  });
  assert.equal(resized.status, 'finished');
  assert.equal(resized.total_pages, 140);
  const statusInput = { title: resized.title, author: resized.author };
  assert.throws(() =>
    fresh.updateBookDetails(book.id, { ...statusInput, status: 'unknown' }),
  );
  assert.equal(
    fresh.updateBookDetails(book.id, { ...statusInput, status: 'paused' })
      .status,
    'paused',
  );
  assert.equal(
    fresh.updateBookDetails(book.id, { ...statusInput, status: 'planned' })
      .current_page,
    140,
  );
  assert.equal(
    fresh.updateBookDetails(book.id, {
      ...statusInput,
      status: 'finished',
      total_pages: 150,
    }).current_page,
    150,
  );
  fresh.startReading(book.id, 140);
  assert.throws(() =>
    fresh.updateBookDetails(book.id, { ...statusInput, status: 'reading' }),
  );
  assert.throws(() => fresh.deleteBook(book.id));
  assert.equal(fresh.listBooks().length, 1);
  fresh.finishReading(140);
  assert.throws(() => fresh.deleteBook(0));
  assert.throws(() => fresh.deleteBook(99999));
  fresh.deleteBook(book.id);
  assert.deepEqual(fresh.listBookNotes(book.id), []);
  assert.deepEqual(fresh.listBooks(), []);
  assert.deepEqual(
    fresh.listCalendarEntries(beforeReading, Date.now() + 1),
    [],
  );
  assert.equal(fresh.getActiveReading(), null);
  assert.throws(() => fresh.deleteBook(book.id));
  fresh.close();
  console.log(
    'PASS: migration, profile validation and persistence, themes, book creation, and calendar entries.',
  );
} finally {
  db?.close();
  fs.rmSync(filename, { force: true });
}
