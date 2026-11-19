import { useState, type FormEvent } from 'react';
import type { Book } from '../shared';
import { maxBookDescriptionLength } from '../shared';
import { BookCoverPicker } from './BookCoverPicker';

export function BookForm({ onAdded }: { onAdded: (book: Book) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formVersion, setFormVersion] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = String(fields.get('title')).trim();
    if (!title) {
      setError('Введи назву книги.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const cover = fields.get('cover');
      const book = await window.api.addBook({
        title,
        author: String(fields.get('author')).trim(),
        total_pages: Number(fields.get('totalPages')),
        description: String(fields.get('description')).trim(),
        cover:
          cover instanceof File && cover.name
            ? new Uint8Array(await cover.arrayBuffer())
            : undefined,
      });
      form.reset();
      setFormVersion((version) => version + 1);
      onAdded(book);
    } catch {
      setError('Не вдалося зберегти книгу. Спробуй ще раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="mb-5 rounded-panel border border-border bg-surface p-4"
      aria-labelledby="add-book-title"
      onSubmit={submit}
      onInput={() => setError('')}
    >
      <h2 id="add-book-title" className="mb-3 text-[17px] font-semibold">
        Додати книгу
      </h2>
      <fieldset
        disabled={saving}
        className="grid items-end gap-3 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]"
      >
        <label className="grid gap-1 text-[13px]">
          Назва
          <input name="title" required maxLength={300} />
        </label>
        <label className="grid gap-1 text-[13px]">
          Автор (необов’язково)
          <input name="author" maxLength={300} />
        </label>
        <label className="grid gap-1 text-[13px]">
          Сторінок
          <input
            name="totalPages"
            type="number"
            min={1}
            max={1000000}
            step={1}
            required
          />
        </label>
        <label className="grid gap-1 text-[13px] min-[1000px]:col-span-full">
          Опис (необов’язково)
          <textarea
            name="description"
            rows={3}
            maxLength={maxBookDescriptionLength}
          />
        </label>
        <BookCoverPicker key={formVersion} />
        <button className="primary-button min-[1000px]:col-span-full min-[1000px]:w-auto min-[1000px]:justify-self-start">
          {saving ? 'Зберігаємо…' : 'Зберегти книгу'}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="error mb-0 mt-3">
          {error}
        </p>
      )}
    </form>
  );
}
