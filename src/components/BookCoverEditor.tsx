import { useState } from 'react';
import type { Book } from '../shared';
import { BookCoverPicker } from './BookCoverPicker';

const buttonStyle =
  'rounded-[8px] border border-border bg-canvas px-3 py-1.5 text-[13px] hover:bg-soft';

export function BookCoverEditor({
  book,
  onUpdated,
}: {
  book: Book;
  onUpdated: (book: Book) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  function close() {
    setEditing(false);
    setSelected(undefined);
    setError(false);
  }

  async function update(file: File | null) {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const cover = file ? new Uint8Array(await file.arrayBuffer()) : null;
      onUpdated(await window.api.updateBookCover(book.id, cover));
      close();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!editing)
    return (
      <button
        type="button"
        className={`mt-3 ${buttonStyle}`}
        onClick={() => setEditing(true)}
      >
        {book.coverUrl ? 'Редагувати обкладинку' : 'Додати обкладинку'}
      </button>
    );

  return (
    <fieldset className="mt-3 grid gap-3" disabled={busy}>
      <BookCoverPicker onSelection={setSelected} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonStyle}
          disabled={!selected || busy}
          onClick={() => selected && void update(selected)}
        >
          Зберегти обкладинку
        </button>
        {book.coverUrl && (
          <button
            type="button"
            className={buttonStyle}
            onClick={() => void update(null)}
          >
            Видалити обкладинку
          </button>
        )}
        <button type="button" className={buttonStyle} onClick={close}>
          Скасувати
        </button>
      </div>
      {busy && (
        <p className="m-0 text-[13px]" role="status">
          Зберігаємо зміни…
        </p>
      )}
      {error && (
        <p className="error m-0" role="alert">
          Не вдалося оновити обкладинку. Спробуй ще раз.
        </p>
      )}
    </fieldset>
  );
}
