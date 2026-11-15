import { useEffect, useState, type FormEvent } from 'react';
import { BookCoverEditor } from '../components/BookCoverEditor';
import { ReadingTimer } from '../components/ReadingTimer';
import { BookForm } from '../components/BookForm';
import type { ActiveReading, Book, BookStatus } from '../shared';

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
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<ActiveReading | null>(null);
  const [readingBook, setReadingBook] = useState<number>();
  const [readingBusy, setReadingBusy] = useState(false);
  const [readingError, setReadingError] = useState('');
  const search = query.trim().toLocaleLowerCase('uk-UA');
  const filteredBooks =
    state.status === 'loaded'
      ? state.books.filter(
          ({ id, title, author }) =>
            id === readingBook ||
            title.toLocaleLowerCase('uk-UA').includes(search) ||
            author.toLocaleLowerCase('uk-UA').includes(search),
        )
      : [];

  useEffect(() => {
    let current = true;
    Promise.all([window.api.listBooks(), window.api.getActiveReading()])
      .then(([books, session]) => {
        if (current) {
          setState({ status: 'loaded', books });
          setActive(session);
          setReadingBook(session?.bookId);
        }
      })
      .catch(() => {
        if (current) setState({ status: 'error' });
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  function updateBook(updated: Book) {
    setState((current) =>
      current.status === 'loaded'
        ? {
            status: 'loaded',
            books: current.books.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          }
        : current,
    );
  }

  async function saveReading(
    event: FormEvent<HTMLFormElement>,
    bookId: number,
  ) {
    event.preventDefault();
    if (readingBusy) return;
    const page = Number(new FormData(event.currentTarget).get('page'));
    setReadingError('');
    setReadingBusy(true);
    try {
      if (active) {
        updateBook(await window.api.finishReading(page));
        setActive(null);
        setReadingBook(undefined);
      } else {
        setActive(await window.api.startReading(bookId, page));
        setQuery('');
      }
    } catch {
      setReadingError('Не вдалося зберегти сесію. Спробуй ще раз.');
    } finally {
      setReadingBusy(false);
    }
  }

  async function toggleReadingPause() {
    if (!active || readingBusy) return;
    setReadingError('');
    setReadingBusy(true);
    try {
      setActive(
        active.runningSince === null
          ? await window.api.resumeReading()
          : await window.api.pauseReading(),
      );
    } catch {
      setReadingError('Не вдалося змінити стан таймера. Спробуй ще раз.');
    } finally {
      setReadingBusy(false);
    }
  }

  return (
    <section className="flex-1 py-6" aria-label="Список книг">
      {state.status === 'loaded' && (
        <BookForm
          onAdded={(book) => {
            setQuery('');
            setState((current) =>
              current.status === 'loaded'
                ? { status: 'loaded', books: [book, ...current.books] }
                : current,
            );
          }}
        />
      )}
      {state.status === 'loaded' && state.books.length > 0 && (
        <label className="mb-4 grid max-w-[440px] gap-1 text-[13px]">
          Пошук книг
          <input
            type="search"
            placeholder="Назва або автор"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}
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
        ) : filteredBooks.length === 0 ? (
          <p
            role="status"
            className="rounded-[16px] border border-border bg-surface p-4 text-[13px]"
          >
            Книг за цим запитом не знайдено.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 min-[1000px]:grid-cols-2">
            {filteredBooks.map((book) => (
              <li
                key={book.id}
                className="min-w-0 rounded-[16px] border border-border bg-surface p-4"
              >
                {book.coverUrl && (
                  <img
                    src={book.coverUrl}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-[126px] w-[84px] rounded-[8px] bg-canvas object-contain"
                  />
                )}
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
                    {active?.bookId === book.id
                      ? active.runningSince === null
                        ? 'На паузі'
                        : 'Читаю зараз'
                      : statusLabels[book.status]}
                  </span>
                  <span className="text-muted">
                    {book.current_page} / {book.total_pages} стор.
                  </span>
                </div>
                <BookCoverEditor book={book} onUpdated={updateBook} />
                {readingBook === book.id ? (
                  <form
                    key={active ? 'finish' : 'start'}
                    className="mt-3 grid gap-2"
                    onSubmit={(event) => void saveReading(event, book.id)}
                  >
                    {active && <ReadingTimer session={active} />}
                    {active && (
                      <button
                        type="button"
                        className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
                        disabled={readingBusy}
                        onClick={toggleReadingPause}
                      >
                        {active.runningSince === null
                          ? 'Продовжити читання'
                          : 'Пауза'}
                      </button>
                    )}
                    <label className="grid gap-1 text-[13px]">
                      {active ? 'Кінцева сторінка' : 'Початкова сторінка'}
                      <input
                        name="page"
                        type="number"
                        min={active?.startPage ?? 1}
                        max={book.total_pages}
                        defaultValue={
                          active?.startPage ?? Math.max(1, book.current_page)
                        }
                        required
                        disabled={readingBusy}
                      />
                    </label>
                    <button className="primary-button" disabled={readingBusy}>
                      {active ? 'Завершити читання' : 'Почати читання'}
                    </button>
                    {!active && (
                      <button
                        type="button"
                        disabled={readingBusy}
                        onClick={() => setReadingBook(undefined)}
                      >
                        Скасувати
                      </button>
                    )}
                    {readingError && (
                      <p className="error m-0" role="alert">
                        {readingError}
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    className="primary-button mt-3"
                    disabled={!!active || readingBusy}
                    onClick={() => {
                      setReadingError('');
                      setReadingBook(book.id);
                    }}
                  >
                    Читати
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
