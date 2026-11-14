import { useEffect, useState, type FormEvent } from 'react';
import type { Book, CalendarEntry } from '../shared';

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const monthFormat = new Intl.DateTimeFormat('uk-UA', {
  month: 'long',
  year: 'numeric',
});
const dateFormat = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'full' });
const timeFormat = new Intl.DateTimeFormat('uk-UA', { timeStyle: 'short' });
const minutesFormat = new Intl.NumberFormat('uk-UA', {
  maximumFractionDigits: 1,
});
const statuses = {
  planned: 'Заплановано',
  completed: 'Виконано',
  cancelled: 'Скасовано',
  read: 'Прочитано',
  reading: 'Читання триває',
} satisfies Record<CalendarEntry['status'], string>;
const control =
  'rounded-[8px] border border-border bg-canvas px-3 py-1.5 text-[13px] hover:bg-soft';
const visibleBookLimit = 2;

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function CalendarPage({ dailyGoal }: { dailyGoal: number }) {
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState(today);
  const [entries, setEntries] = useState<{
    month: number;
    items: CalendarEntry[];
    failed: boolean;
  }>();
  const [books, setBooks] = useState<Book[]>();
  const [booksFailed, setBooksFailed] = useState(false);
  const [request, setRequest] = useState(0);
  const [bookId, setBookId] = useState('');
  const [mode, setMode] = useState<'plan' | 'session'>('plan');
  const [time, setTime] = useState('18:00');
  const [minutes, setMinutes] = useState(String(dailyGoal));
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    day: number;
    message: string;
    failed: boolean;
  }>();
  const date = new Date(selected);
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const monthStart = first.getTime();
  const monthEnd = new Date(year, month + 1, 1).getTime();
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((offset + days) / 7) * 7;

  useEffect(() => {
    let current = true;
    window.api
      .listCalendarEntries(monthStart, monthEnd)
      .then((items) => {
        if (current) setEntries({ month: monthStart, items, failed: false });
      })
      .catch(() => {
        if (current) setEntries({ month: monthStart, items: [], failed: true });
      });
    return () => {
      current = false;
    };
  }, [monthStart, monthEnd, request]);

  useEffect(() => {
    let current = true;
    window.api
      .listBooks()
      .then((items) => {
        if (current) {
          setBooks(items);
          setBooksFailed(false);
        }
      })
      .catch(() => {
        if (current) setBooksFailed(true);
      });
    return () => {
      current = false;
    };
  }, [request]);

  const visibleEntries = entries?.month === monthStart ? entries : undefined;
  const entriesByDay = new Map<number, CalendarEntry[]>();
  for (const entry of visibleEntries?.items ?? []) {
    const day = startOfDay(new Date(entry.startsAt));
    const items = entriesByDay.get(day);
    if (items) items.push(entry);
    else entriesByDay.set(day, [entry]);
  }
  const selectedEntries = entriesByDay.get(selected) ?? [];
  const coversByBook = new Map(
    books?.map(({ id, coverUrl }) => [id, coverUrl]),
  );

  function selectDay(day: number) {
    setSelected(day);
    setSaveResult(undefined);
  }

  function shiftMonth(delta: number) {
    selectDay(new Date(year, month + delta, 1).getTime());
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const [hours, minute] = time.split(':').map(Number);
    const start = new Date(selected);
    start.setHours(hours, minute, 0, 0);
    if (start.getHours() !== hours || start.getMinutes() !== minute) {
      setSaveResult({
        day: selected,
        message: 'Цей місцевий час недоступний. Вибери інший.',
        failed: true,
      });
      return;
    }
    const entry = {
      bookId: Number(bookId),
      startsAt: start.getTime(),
      minutes: Number(minutes),
    };
    if (
      mode === 'session' &&
      entry.startsAt + entry.minutes * 60_000 > Date.now()
    ) {
      setSaveResult({
        day: selected,
        message: 'Вибери час і тривалість уже завершеного читання.',
        failed: true,
      });
      return;
    }
    setSaving(true);
    setSaveResult(undefined);
    try {
      if (mode === 'session') await window.api.logReadingSession(entry);
      else await window.api.addReadingPlan(entry);
      setRequest((value) => value + 1);
      setSaveResult({
        day: selected,
        message:
          mode === 'session' ? 'Читання записано.' : 'Читання заплановано.',
        failed: false,
      });
    } catch {
      setSaveResult({
        day: selected,
        message: 'Не вдалося зберегти запис. Спробуй ще раз.',
        failed: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="grid flex-1 content-start items-start gap-5 py-6 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)]"
      aria-label="Календар читання"
    >
      <div className="min-w-0 rounded-[16px] border border-border bg-surface p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2
            className="m-0 text-[20px] font-semibold capitalize"
            aria-live="polite"
          >
            {monthFormat.format(first)}
          </h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={control}
              onClick={() => selectDay(today)}
            >
              Сьогодні
            </button>
            <button
              type="button"
              className={control}
              aria-label="Попередній місяць"
              onClick={() => shiftMonth(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className={control}
              aria-label="Наступний місяць"
              onClick={() => shiftMonth(1)}
            >
              ›
            </button>
          </div>
        </div>
        <div
          className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted"
          aria-hidden="true"
        >
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div
          className="grid grid-cols-7 gap-1"
          role="group"
          aria-label="Дні місяця"
        >
          {Array.from({ length: cellCount }, (_, index) => {
            const day = index - offset + 1;
            if (day < 1 || day > days)
              return <span key={index} aria-hidden="true" />;
            const timestamp = new Date(year, month, day).getTime();
            const dayEntries = entriesByDay.get(timestamp);
            const readingBooks = new Map<number, string>();
            for (const entry of dayEntries ?? []) {
              if (entry.status === 'read' || entry.status === 'reading') {
                readingBooks.set(entry.bookId, entry.bookTitle);
              }
            }
            const shownBooks = [...readingBooks].slice(0, visibleBookLimit);
            const extraBooks = readingBooks.size - shownBooks.length;
            const bookNames = [...readingBooks.values()].join(', ');
            return (
              <button
                key={index}
                type="button"
                className="flex min-h-[84px] min-w-0 flex-col items-center gap-1 rounded-[8px] border border-solid border-transparent bg-transparent px-0.5 py-1 text-[13px] hover:bg-soft aria-[current=date]:border-accent aria-pressed:bg-accent aria-pressed:text-accent-text"
                aria-label={
                  dateFormat.format(timestamp) +
                  (bookNames
                    ? `, ${bookNames}`
                    : dayEntries
                      ? ', є записи'
                      : '')
                }
                aria-current={timestamp === today ? 'date' : undefined}
                aria-pressed={timestamp === selected}
                onClick={() => selectDay(timestamp)}
              >
                {day}
                {shownBooks.length > 0 ? (
                  <span
                    aria-hidden="true"
                    className="flex w-full justify-center gap-0.5"
                  >
                    {shownBooks.map(([id]) => {
                      const cover = coversByBook.get(id);
                      return cover ? (
                        <img
                          key={id}
                          src={cover}
                          alt=""
                          className="h-9 w-6 min-w-0 shrink rounded-[3px] object-contain"
                        />
                      ) : (
                        <span
                          key={id}
                          className="grid h-9 w-6 min-w-0 shrink place-items-center overflow-hidden rounded-[3px] bg-surface text-accent"
                        >
                          ▤
                        </span>
                      );
                    })}
                  </span>
                ) : dayEntries ? (
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full bg-current"
                  />
                ) : null}
                {extraBooks > 0 && (
                  <span aria-hidden="true" className="text-[10px] leading-none">
                    +{extraBooks}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 rounded-[16px] border border-border bg-surface p-4">
        <h2 className="mb-2 text-[17px] font-semibold first-letter:uppercase">
          {dateFormat.format(selected)}
        </h2>
        {!visibleEntries ? (
          <p role="status" className="text-[13px]">
            Завантажуємо записи…
          </p>
        ) : visibleEntries.failed ? (
          <p role="alert" className="text-[13px]">
            Не вдалося завантажити записи.
          </p>
        ) : selectedEntries.length === 0 ? (
          <p className="text-[13px]">На цей день записів немає.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {selectedEntries.map((entry) => (
              <li
                key={`${entry.status}-${entry.id}`}
                className="rounded-[8px] bg-canvas px-3 py-2"
              >
                <strong className="block wrap-anywhere text-[13px]">
                  {entry.bookTitle}
                </strong>
                <span className="text-[11px] text-muted">
                  {timeFormat.format(entry.startsAt)} ·{' '}
                  {entry.status !== 'reading' &&
                    `${minutesFormat.format(entry.minutes)} хв · `}
                  {statuses[entry.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
        {(visibleEntries?.failed || booksFailed) && (
          <button
            type="button"
            className={control}
            onClick={() => setRequest((value) => value + 1)}
          >
            Повторити завантаження
          </button>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="m-0 mb-2 text-[15px] font-semibold">Додати запис</h3>
          {booksFailed ? (
            <p className="m-0 text-[13px]" role="alert">
              Не вдалося завантажити книги.
            </p>
          ) : !books ? (
            <p className="m-0 text-[13px]" role="status">
              Завантажуємо книги…
            </p>
          ) : books.length === 0 ? (
            <p className="m-0 text-[13px]">
              Для запису потрібна книга в бібліотеці.
            </p>
          ) : (
            <form onSubmit={saveEntry}>
              <fieldset disabled={saving} className="grid gap-3">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Тип запису"
                >
                  <button
                    type="button"
                    className={
                      control +
                      ' aria-pressed:bg-soft aria-pressed:font-semibold'
                    }
                    aria-pressed={mode === 'plan'}
                    onClick={() => {
                      setMode('plan');
                      setSaveResult(undefined);
                    }}
                  >
                    Запланувати
                  </button>
                  <button
                    type="button"
                    className={
                      control +
                      ' aria-pressed:bg-soft aria-pressed:font-semibold'
                    }
                    aria-pressed={mode === 'session'}
                    onClick={() => {
                      setMode('session');
                      setSaveResult(undefined);
                    }}
                  >
                    Записати прочитане
                  </button>
                </div>
                <label className="grid gap-1 text-[12px]">
                  Книга
                  <select
                    className="w-full min-w-0 rounded-[8px] border border-border bg-input p-2 text-ink [font:inherit] focus-visible:outline-2 focus-visible:outline-accent"
                    value={bookId}
                    onChange={(event) => setBookId(event.target.value)}
                    required
                  >
                    <option value="">Вибери книгу</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid min-w-0 gap-1 text-[12px]">
                    Час початку
                    <input
                      className="min-w-0 p-2"
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      required
                    />
                  </label>
                  <label className="grid min-w-0 gap-1 text-[12px]">
                    Хвилини
                    <input
                      className="min-w-0 p-2"
                      type="number"
                      min="1"
                      max="1440"
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <button className="primary-button" disabled={saving}>
                  {saving ? 'Зберігаємо…' : 'Додати до календаря'}
                </button>
              </fieldset>
              {saveResult?.day === selected && (
                <p
                  role={saveResult.failed ? 'alert' : 'status'}
                  className="mb-0 mt-2 text-[13px]"
                >
                  {saveResult.message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
