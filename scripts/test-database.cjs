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
  db.setTheme('light');
  assert.equal(db.getAccount().theme, 'light');
  db.close();
  db = undefined;
  const check = new DatabaseSync(filename);
  assert.equal(check.prepare('PRAGMA user_version').get().user_version, 2);
  assert.equal(
    check.prepare('PRAGMA integrity_check').get().integrity_check,
    'ok',
  );
  check.close();
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
  fresh.close();
  console.log(
    'PASS: migration, profile validation and persistence, themes, and book creation.',
  );
} finally {
  db?.close();
  fs.rmSync(filename, { force: true });
}
