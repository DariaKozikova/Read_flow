import { useEffect, useState, type FormEvent } from 'react';
import { BookDetailsEditor } from '../components/BookDetailsEditor';
import { BookDeleteButton } from '../components/BookDeleteButton';
import { ReadingTimer } from '../components/ReadingTimer';
import { BookForm } from '../components/BookForm';
import { BookPage } from './BookPage';
import type { ActiveReading, Book, BookStatus } from '../shared';
import { bookStatusLabels } from '../shared';

type LibraryState =
  | { status: 'loading' | 'error' }
  | { status: 'loaded'; books: Book[] };

const sortLabels = {
  newest: 'Спочатку нові',
  oldest: 'Спочатку давні',
  title: 'За назвою',
  author: 'За автором',
};
type BookSort = keyof typeof sortLabels;
const collator = new Intl.Collator('uk-UA', {
  sensitivity: 'base',
  numeric: true,
});

export function LibraryPage() {
  const [state, setState] = useState<LibraryState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [openedBookId, setOpenedBookId] = useState<number>();
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');
  const [sort, setSort] = useState<BookSort>('newest');
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<ActiveReading | null>(null);
  const [readingBook, setReadingBook] = useState<number>();
  const [readingBusy, setReadingBusy] = useState(false);
  const [readingError, setReadingError] = useState('');
  const search = query.trim().toLocaleLowerCase('uk-UA');
  const filteredBooks =
    state.status === 'loaded'
      ? state.books.filter(
          ({ id, title, author, status }) =>
            id === readingBook ||
            ((statusFilter === 'all' || status === statusFilter) &&
              (title.toLocaleLowerCase('uk-UA').includes(search) ||
                author.toLocaleLowerCase('uk-UA').includes(search))),
        )
      : [];
  filteredBooks.sort((first, second) => {
    if (sort === 'newest') return second.id - first.id;
    if (sort === 'oldest') return first.id - second.id;
    if (sort === 'author') {
      if (!first.author && second.author) return 1;
      if (first.author && !second.author) return -1;
      const authorOrder = collator.compare(first.author, second.author);
      if (authorOrder) return authorOrder;
    }
    return collator.compare(first.title, second.title) || second.id - first.id;
  });

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

  const openedBook =
    state.status === 'loaded'
      ? state.books.find((book) => book.id === openedBookId)
      : undefined;
  if (openedBook)
    return (
      <BookPage
        key={openedBook.id}
        book={openedBook}
        onBack={() => setOpenedBookId(undefined)}
      />
    );

  return (
    <section className="flex-1 py-6" aria-label="Список книг">
      {state.status === 'loaded' && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 flex-1 basis-[240px] gap-1 text-[13px]">
            Пошук книг
            <input
              type="search"
              placeholder="Назва або автор"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-[13px]">
            Статус
            <select
              className="rounded-control border border-border bg-input px-3 py-3 text-ink [font:inherit]"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as BookStatus | 'all')
              }
            >
              <option value="all">Усі книги</option>
              {(Object.keys(bookStatusLabels) as BookStatus[]).map((status) => (
                <option key={status} value={status}>
                  {bookStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px]">
            Сортування
            <select
              className="rounded-control border border-border bg-input px-3 py-3 text-ink [font:inherit]"
              value={sort}
              onChange={(event) => setSort(event.target.value as BookSort)}
            >
              {(Object.keys(sortLabels) as BookSort[]).map((value) => (
                <option key={value} value={value}>
                  {sortLabels[value]}
                </option>
              ))}
            </select>
          </label>
          {(query || statusFilter !== 'all') && (
            <button
              type="button"
              className="rounded-control border border-border bg-surface px-3 py-3 text-[13px] hover:bg-soft"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
            >
              Скинути фільтри
            </button>
          )}
        </div>
      )}
      {state.status === 'loaded' && (
        <BookForm
          onAdded={(book) => {
            setQuery('');
            setStatusFilter('all');
            setState((current) =>
              current.status === 'loaded'
                ? { status: 'loaded', books: [book, ...current.books] }
                : current,
            );
          }}
        />
      )}
      {state.status === 'loading' && <p role="status">Завантажуємо книги…</p>}
      {state.status === 'error' && (
        <>
          <p role="alert">Не вдалося завантажити книги.</p>
          <button
            type="button"
            className="rounded-control border border-border bg-surface px-3 py-2 text-[13px] hover:bg-soft"
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
          <div className="rounded-panel border border-border bg-surface p-6 text-center">
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
            className="rounded-panel border border-border bg-surface p-4 text-[13px]"
          >
            Книг за вибраними умовами не знайдено.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-3 p-0">
            {filteredBooks.map((book) => (
              <li
                key={book.id}
                className="min-w-0 rounded-panel border border-border bg-surface p-4"
              >
                {book.coverUrl && (
                  <button
                    type="button"
                    className="mb-3 block border-0 bg-transparent p-0"
                    aria-label={`Відкрити книгу «${book.title}»`}
                    onClick={() => setOpenedBookId(book.id)}
                  >
                    <img
                      src={book.coverUrl}
                      alt=""
                      loading="lazy"
                      className="h-[126px] w-[84px] rounded-control bg-canvas object-contain"
                    />
                  </button>
                )}
                <h2 className="mb-1 wrap-anywhere text-[17px] font-semibold">
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 text-left [font:inherit] hover:underline"
                    onClick={() => setOpenedBookId(book.id)}
                  >
                    {book.title}
                  </button>
                </h2>
                {book.author && (
                  <p className="mb-2 wrap-anywhere text-[13px]">
                    {book.author}
                  </p>
                )}
                {book.description && (
                  <p className="mb-3 whitespace-pre-wrap wrap-anywhere text-[13px]">
                    {book.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="rounded-control bg-soft px-2 py-1 font-medium text-accent">
                    {active?.bookId === book.id
                      ? active.runningSince === null
                        ? 'На паузі'
                        : 'Читаю зараз'
                      : bookStatusLabels[book.status]}
                  </span>
                  <span className="text-muted">
                    {book.current_page} / {book.total_pages} стор.
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 items-start gap-2">
                  <BookDetailsEditor
                    book={book}
                    readingActive={active?.bookId === book.id}
                    onUpdated={(updated) => {
                      setQuery('');
                      setStatusFilter('all');
                      updateBook(updated);
                    }}
                  />
                  <BookDeleteButton
                    book={book}
                    active={active?.bookId === book.id}
                    onDeleted={(id) => {
                      setState((current) =>
                        current.status === 'loaded'
                          ? {
                              ...current,
                              books: current.books.filter(
                                (item) => item.id !== id,
                              ),
                            }
                          : current,
                      );
                      if (readingBook === id) setReadingBook(undefined);
                    }}
                  />
                </div>
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
                        className="rounded-control border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
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
