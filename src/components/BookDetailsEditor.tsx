import { useState, type FormEvent } from 'react';
import type { Book } from '../shared';
import { BookCoverPicker } from './BookCoverPicker';

const buttonClass =
  'rounded-control border border-border bg-canvas px-3 py-1.5 text-[13px] hover:bg-soft';

export function BookDetailsEditor({
  book,
  onUpdated,
}: {
  book: Book;
  onUpdated: (book: Book) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedCover, setSelectedCover] = useState<File>();
  const [removeCover, setRemoveCover] = useState(false);
  const [pickerVersion, setPickerVersion] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get('title')).trim();
    if (!title) {
      setError('Введи назву книги.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await window.api.updateBookDetails(book.id, {
        title,
        author: String(fields.get('author')).trim(),
        total_pages: Number(fields.get('totalPages')),
        cover: selectedCover
          ? new Uint8Array(await selectedCover.arrayBuffer())
          : removeCover
            ? null
            : undefined,
      });
      onUpdated(updated);
      setEditing(false);
    } catch {
      setError(
        'Не вдалося зберегти зміни. Перевір кількість сторінок і спробуй ще раз.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editing)
    return (
      <button
        type="button"
        className={`mt-3 ${buttonClass}`}
        onClick={() => {
          setError('');
          setSelectedCover(undefined);
          setRemoveCover(false);
          setEditing(true);
        }}
      >
        Редагувати
      </button>
    );

  return (
    <form
      className="mt-3"
      aria-label={`Редагування книги «${book.title}»`}
      onSubmit={submit}
      onInput={() => setError('')}
    >
      <fieldset disabled={saving} className="grid gap-2">
        <label className="grid gap-1 text-[13px]">
          Назва
          <input
            name="title"
            defaultValue={book.title}
            maxLength={300}
            required
          />
        </label>
        <label className="grid gap-1 text-[13px]">
          Автор (необов’язково)
          <input name="author" defaultValue={book.author} maxLength={300} />
        </label>
        <label className="grid gap-1 text-[13px]">
          Кількість сторінок
          <input
            name="totalPages"
            type="number"
            min={Math.max(1, book.current_page)}
            max={1000000}
            step={1}
            defaultValue={book.total_pages}
            required
          />
        </label>
        <p className="m-0 text-[12px]">
          Кількість сторінок має охоплювати поточний прогрес і збережені сесії.
        </p>
        {!selectedCover && book.coverUrl && !removeCover && (
          <img
            src={book.coverUrl}
            alt="Поточна обкладинка"
            className="h-[126px] w-[84px] object-contain"
          />
        )}
        <BookCoverPicker
          key={pickerVersion}
          onSelection={(file) => {
            setSelectedCover(file);
            if (file) setRemoveCover(false);
          }}
        />
        {(selectedCover || (book.coverUrl && !removeCover)) && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setSelectedCover(undefined);
              setRemoveCover(true);
              setPickerVersion((value) => value + 1);
            }}
          >
            Прибрати обкладинку
          </button>
        )}
        {removeCover && (
          <p className="m-0 text-[13px]">
            Обкладинку буде видалено після збереження.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass}>
            {saving ? 'Зберігаємо…' : 'Зберегти'}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => setEditing(false)}
          >
            Скасувати
          </button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="error m-0 mt-2">
          {error}
        </p>
      )}
    </form>
  );
}
