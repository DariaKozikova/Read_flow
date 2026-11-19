import { useState } from 'react';
import type { Book } from '../shared';

const buttonClass =
  'rounded-control border border-border bg-canvas px-3 py-1.5 text-[13px] hover:bg-soft';

export function BookDeleteButton({
  book,
  active,
  onDeleted,
}: {
  book: Book;
  active: boolean;
  onDeleted: (id: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await window.api.deleteBook(book.id);
      onDeleted(book.id);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {confirming ? (
        <div
          className="grid gap-2 border-t border-border pt-3"
          role="group"
          aria-label={`Видалення книги «${book.title}»`}
        >
          <p className="m-0 text-[13px]">
            Видалити «{book.title}»? Разом із книгою буде видалено її
            обкладинку, нотатки та історію читання.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={busy || active}
              onClick={() => void remove()}
            >
              {busy ? 'Видаляємо…' : 'Видалити книгу'}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setFailed(false);
              }}
            >
              Скасувати
            </button>
          </div>
          {failed && (
            <p role="alert" className="error m-0">
              Не вдалося видалити книгу. Заверши її активну сесію та спробуй ще
              раз.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={buttonClass}
          disabled={active}
          onClick={() => setConfirming(true)}
        >
          Видалити
        </button>
      )}
      {active && (
        <p className="m-0 mt-1 text-[12px]">
          Для видалення заверши сесію читання цієї книги.
        </p>
      )}
    </div>
  );
}
