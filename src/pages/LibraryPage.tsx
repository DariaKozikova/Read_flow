import { useEffect, useState } from 'react';
import type { Book, BookStatus } from '../shared';

const statusLabels: Record<BookStatus, string> = {
  planned: 'У планах',
  reading: 'Читаю',
  paused: 'На паузі',
  finished: 'Прочитано',
};

type LibraryState =
  | { status: 'loading' | 'error' }
  | { status: 'loaded'; books: Book[] };

export function LibraryPage() {
  const [state, setState] = useState<LibraryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    window.api
      .listBooks()
      .then((books) => {
        if (current) setState({ status: 'loaded', books });
      })
      .catch(() => {
        if (current) setState({ status: 'error' });
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <section className="flex-1 py-6" aria-label="Список книг">
      {state.status === 'loading' && <p role="status">Завантажуємо книги…</p>}
      {state.status === 'error' && (
        <>
          <p role="alert">Не вдалося завантажити книги.</p>
          <button
            type="button"
            className="rounded-[8px] border border-border bg-surface px-3 py-2 text-[13px] hover:bg-soft"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((value) => value + 1);
            }}
          >
            Повторити завантаження
          </button>
        </>
      )}
      {state.status === 'loaded' &&
        (state.books.length === 0 ? (
          <div className="rounded-[16px] border border-border bg-surface p-6 text-center">
            <h2 className="mb-2 text-[18px] font-semibold">
              Бібліотека поки порожня
            </h2>
            <p className="m-0 text-[13px]">
              Тут з’являться твої збережені книги.
            </p>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 min-[1000px]:grid-cols-2">
            {state.books.map((book) => (
              <li
                key={book.id}
                className="min-w-0 rounded-[16px] border border-border bg-surface p-4"
              >
                <h2 className="mb-1 wrap-anywhere text-[17px] font-semibold">
                  {book.title}
                </h2>
                {book.author && (
                  <p className="mb-2 wrap-anywhere text-[13px]">
                    {book.author}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="rounded-full bg-soft px-2 py-1 font-medium text-accent">
                    {statusLabels[book.status]}
                  </span>
                  <span className="text-muted">
                    {book.current_page} / {book.total_pages} стор.
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
