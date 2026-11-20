import { useEffect, useState } from 'react';
import type { Book } from '../shared';
import { bookStatusLabels } from '../shared';

export function CurrentBook() {
  const [book, setBook] = useState<Book | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    window.api
      .getCurrentBook()
      .then((item) => {
        if (current) setBook(item);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <section
      className="mt-6 max-w-[720px] rounded-panel border border-border bg-surface p-5"
      aria-labelledby="current-book-title"
    >
      <h2 id="current-book-title" className="mb-4 text-[20px] font-semibold">
        Поточна книга
      </h2>
      {failed ? (
        <>
          <p role="alert">Не вдалося завантажити книгу.</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Повторити
          </button>
        </>
      ) : book === undefined ? (
        <p className="m-0 text-[13px]" role="status">
          Завантажуємо книгу…
        </p>
      ) : book === null ? (
        <p className="m-0 text-[13px]">
          Почни читання книги в бібліотеці, і вона з’явиться тут.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          {book.coverUrl && (
            <img
              src={book.coverUrl}
              alt=""
              className="h-[180px] w-[120px] object-contain"
            />
          )}
          <div className="min-w-0 flex-1 basis-[200px]">
            <h3 className="m-0 mb-1 wrap-anywhere text-[20px] font-bold">
              {book.title}
            </h3>
            {book.author && (
              <p className="mb-2 wrap-anywhere text-[14px]">{book.author}</p>
            )}
            <p className="mb-3 text-[13px]">{bookStatusLabels[book.status]}</p>
            <label className="grid gap-2 text-[13px]">
              {book.current_page} із {book.total_pages} сторінок
              <progress
                className="h-2 w-full accent-accent"
                max={book.total_pages}
                value={book.current_page}
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
