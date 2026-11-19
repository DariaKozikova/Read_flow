import { useEffect, useState } from 'react';
import { bookStatusLabels, type Book, type CalendarEntry } from '../shared';

const dateFormat = new Intl.DateTimeFormat('uk-UA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const minutesFormat = new Intl.NumberFormat('uk-UA', {
  maximumFractionDigits: 1,
});

export function BookPage({ book, onBack }: { book: Book; onBack: () => void }) {
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const [sessions, setSessions] = useState<CalendarEntry[] | null>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    window.api
      .listBookSessions(book.id)
      .then((items) => {
        if (current) setSessions(items);
      })
      .catch(() => {
        if (current) setSessions(null);
      });
    return () => {
      current = false;
    };
  }, [book.id, attempt]);

  return (
    <section className="py-6" aria-label={book.title}>
      <button
        type="button"
        className="mb-4 rounded-control border border-border bg-surface px-3 py-2 text-[13px]"
        onClick={onBack}
      >
        ← До бібліотеки
      </button>
      <div className="rounded-panel border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-5">
          {book.coverUrl && (
            <img
              src={book.coverUrl}
              alt=""
              className="h-[240px] w-[160px] object-contain"
            />
          )}
          <div className="min-w-0 flex-1 basis-[240px]">
            <h2 className="mb-1 wrap-anywhere text-[24px] font-bold">
              {book.title}
            </h2>
            {book.author && <p className="mb-3 wrap-anywhere">{book.author}</p>}
            <p className="mb-2 text-[13px]">{bookStatusLabels[book.status]}</p>
            <label className="grid gap-2 text-[13px]">
              {book.current_page} із {book.total_pages} сторінок
              <progress
                max={book.total_pages}
                value={book.current_page}
                className="h-2 w-full accent-accent"
              />
            </label>
          </div>
        </div>
        <div
          className="mt-5 flex gap-4 border-b border-border"
          role="group"
          aria-label="Розділи книги"
        >
          {(['overview', 'history'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={tab === value}
              className="border-0 border-b-2 border-solid border-transparent bg-transparent px-0 py-2 aria-pressed:border-accent aria-pressed:font-bold"
              onClick={() => setTab(value)}
            >
              {value === 'overview' ? 'Огляд' : 'Історія читання'}
            </button>
          ))}
        </div>
        {tab === 'overview' ? (
          <p className="mb-0 mt-4 whitespace-pre-wrap wrap-anywhere text-[14px]">
            {book.description || 'Опис ще не додано.'}
          </p>
        ) : sessions === undefined ? (
          <p role="status" className="mt-4">
            Завантажуємо історію…
          </p>
        ) : sessions === null ? (
          <div className="mt-4">
            <p role="alert">Не вдалося завантажити історію.</p>
            <button
              type="button"
              onClick={() => {
                setSessions(undefined);
                setAttempt((value) => value + 1);
              }}
            >
              Повторити
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="mb-0 mt-4">Завершених сесій ще немає.</p>
        ) : (
          <ul className="m-0 mt-4 grid list-none gap-3 p-0">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="border-b border-border pb-3 text-[13px]"
              >
                <time dateTime={new Date(session.startsAt).toISOString()}>
                  {dateFormat.format(session.startsAt)}
                </time>
                <p className="m-0 mt-1">
                  Сторінки {session.startPage}–{session.endPage} ·{' '}
                  {minutesFormat.format(session.minutes)} хв
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
