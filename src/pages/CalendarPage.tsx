import { useEffect, useState } from 'react';
import { summarizeReading } from '../readingSummary';
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
  read: 'Прочитано',
  reading: 'Читання триває',
  paused: 'На паузі',
} satisfies Record<CalendarEntry['status'], string>;
const control =
  'rounded-control border border-border bg-canvas px-3 py-1.5 text-[13px] hover:bg-soft';
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
  const monthly =
    visibleEntries && !visibleEntries.failed
      ? summarizeReading(visibleEntries.items)
      : undefined;
  const entriesByDay = new Map<number, CalendarEntry[]>();
  for (const entry of visibleEntries?.items ?? []) {
    const day = startOfDay(new Date(entry.startsAt));
    const items = entriesByDay.get(day);
    if (items) items.push(entry);
    else entriesByDay.set(day, [entry]);
  }
  const selectedEntries = entriesByDay.get(selected) ?? [];
  const { milliseconds: readMilliseconds } = summarizeReading(selectedEntries);
  const readMinutes = Math.floor(readMilliseconds / 60_000);
  const minutesLeft = Math.max(0, dailyGoal - readMinutes);
  const coversByBook = new Map(
    books?.map(({ id, coverUrl }) => [id, coverUrl]),
  );

  function shiftMonth(delta: number) {
    setSelected(new Date(year, month + delta, 1).getTime());
  }

  return (
    <section
      className="grid flex-1 content-start items-start gap-5 py-6 @min-[720px]:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)]"
      aria-label="Календар читання"
    >
      <div
        className="rounded-panel border border-border bg-surface p-4 @min-[720px]:col-span-full"
        aria-label="Підсумок за вибраний місяць"
      >
        {monthly ? (
          <dl className="m-0 grid grid-cols-3 gap-3">
            {[
              {
                label: 'Хвилини за місяць',
                value: Math.floor(monthly.milliseconds / 60_000),
              },
              { label: 'Прочитані сторінки', value: monthly.pages },
              { label: 'Дні з читанням', value: monthly.dayCount },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[12px] text-muted">{label}</dt>
                <dd className="m-0 text-[24px] font-semibold tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p
            className="m-0 text-[13px]"
            role={visibleEntries?.failed ? 'alert' : 'status'}
          >
            {visibleEntries?.failed
              ? 'Не вдалося завантажити підсумок місяця.'
              : 'Завантажуємо підсумок місяця…'}
          </p>
        )}
      </div>
      <div className="min-w-0 rounded-panel border border-border bg-surface p-4">
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
              onClick={() => setSelected(today)}
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
              readingBooks.set(entry.bookId, entry.bookTitle);
            }
            const shownBooks = [...readingBooks].slice(0, visibleBookLimit);
            const extraBooks = readingBooks.size - shownBooks.length;
            const bookNames = [...readingBooks.values()].join(', ');
            return (
              <button
                key={index}
                type="button"
                className="relative aspect-[2/3] w-full min-w-0 overflow-hidden rounded-control border border-solid border-transparent bg-transparent p-0 text-[13px] leading-4 hover:bg-soft aria-[current=date]:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-text"
                aria-label={
                  dateFormat.format(timestamp) +
                  (bookNames ? `, ${bookNames}` : '')
                }
                aria-current={timestamp === today ? 'date' : undefined}
                aria-pressed={timestamp === selected}
                onClick={() => setSelected(timestamp)}
              >
                <span className="pointer-events-none absolute inset-x-1 top-1 z-10 flex items-start justify-between gap-0.5 tabular-nums">
                  <span
                    className={
                      shownBooks.length > 0
                        ? 'rounded-[4px] bg-ink px-1 font-semibold text-canvas'
                        : 'px-1'
                    }
                  >
                    {day}
                  </span>
                  {extraBooks > 0 && (
                    <span
                      aria-hidden="true"
                      className="rounded-[4px] bg-ink px-1 text-[10px] font-semibold text-canvas"
                    >
                      +{extraBooks}
                    </span>
                  )}
                </span>
                {shownBooks.length > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex gap-px"
                  >
                    {shownBooks.map(([id]) => {
                      const cover = coversByBook.get(id);
                      return cover ? (
                        <img
                          key={id}
                          src={cover}
                          alt=""
                          className="h-full w-0 min-w-0 flex-1 object-contain"
                        />
                      ) : (
                        <span
                          key={id}
                          className="grid min-w-0 flex-1 place-items-center bg-soft text-[20px] text-accent"
                        >
                          ▤
                        </span>
                      );
                    })}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 rounded-panel border border-border bg-surface p-4">
        <h2 className="mb-2 text-[17px] font-semibold first-letter:uppercase">
          {dateFormat.format(selected)}
        </h2>
        {visibleEntries && !visibleEntries.failed && (
          <div className="mb-4 grid gap-1.5 rounded-control bg-soft px-3 py-2">
            <p className="m-0 text-[13px] font-semibold text-ink">
              Прочитано {readMinutes} хв із {dailyGoal} хв
            </p>
            <progress
              className="h-2 w-full accent-accent"
              aria-label="Прогрес до денної цілі читання"
              max={dailyGoal}
              value={Math.min(readMilliseconds / 60_000, dailyGoal)}
            />
            <p className="m-0 text-[12px] text-ink">
              {minutesLeft === 0
                ? 'Денну ціль виконано'
                : `До денної цілі: ${minutesLeft} хв`}
            </p>
          </div>
        )}
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
                className="rounded-control bg-canvas px-3 py-2"
              >
                <strong className="block wrap-anywhere text-[13px]">
                  {entry.bookTitle}
                </strong>
                <span className="text-[11px] text-muted">
                  {timeFormat.format(entry.startsAt)} ·{' '}
                  {entry.status !== 'reading' &&
                    entry.status !== 'paused' &&
                    `${minutesFormat.format(entry.minutes)} хв · `}
                  {statuses[entry.status]}
                </span>
                {entry.startPage > 0 && (
                  <p className="m-0 mt-1 text-[12px]">
                    {entry.endPage === null
                      ? `Початкова сторінка: ${entry.startPage}`
                      : entry.startPage === entry.endPage
                        ? `Сторінка ${entry.startPage}`
                        : `Сторінки ${entry.startPage}–${entry.endPage}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {booksFailed && (
          <p role="alert" className="text-[13px]">
            Не вдалося завантажити обкладинки.
          </p>
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
      </div>
    </section>
  );
}
