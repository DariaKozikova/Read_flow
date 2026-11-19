import { useEffect, useState, type FormEvent } from 'react';
import type { BookNote } from '../shared';

export function BookNotes({
  bookId,
  totalPages,
}: {
  bookId: number;
  totalPages: number;
}) {
  const [notes, setNotes] = useState<BookNote[] | null>();
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    window.api
      .listBookNotes(bookId)
      .then((items) => {
        if (current) setNotes(items);
      })
      .catch(() => {
        if (current) setNotes(null);
      });
    return () => {
      current = false;
    };
  }, [bookId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !notes) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const content = String(fields.get('content')).trim();
    if (!content) {
      setError('Введи текст нотатки.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const page = String(fields.get('page'));
      const note = await window.api.addBookNote(bookId, {
        content,
        pageNumber: page ? Number(page) : null,
      });
      setNotes((current) => (current ? [note, ...current] : current));
      form.reset();
    } catch {
      setError('Не вдалося зберегти нотатку. Перевір дані та спробуй ще раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      {notes === undefined ? (
        <p role="status">Завантажуємо нотатки…</p>
      ) : notes === null ? (
        <>
          <p role="alert">Не вдалося завантажити нотатки.</p>
          <button
            type="button"
            onClick={() => {
              setNotes(undefined);
              setAttempt((value) => value + 1);
            }}
          >
            Повторити
          </button>
        </>
      ) : (
        <>
          <form className="mb-5" onSubmit={submit}>
            <fieldset disabled={saving} className="grid gap-3">
              <label className="grid gap-1 text-[13px]">
                Нова нотатка
                <textarea name="content" rows={4} required maxLength={10000} />
              </label>
              <label className="grid max-w-[220px] gap-1 text-[13px]">
                Сторінка (необов’язково)
                <input
                  name="page"
                  type="number"
                  min={1}
                  max={totalPages}
                  step={1}
                />
              </label>
              <button className="primary-button w-auto justify-self-start">
                {saving ? 'Зберігаємо…' : 'Додати нотатку'}
              </button>
            </fieldset>
            {error && (
              <p role="alert" className="error mt-2">
                {error}
              </p>
            )}
          </form>
          {notes.length === 0 ? (
            <p>Нотаток ще немає.</p>
          ) : (
            <ul className="m-0 grid list-none gap-4 p-0">
              {notes.map((note) => (
                <li key={note.id} className="border-t border-border pt-3">
                  {note.pageNumber !== null && (
                    <p className="mb-1 text-[12px]">
                      Сторінка {note.pageNumber}
                    </p>
                  )}
                  <p className="m-0 whitespace-pre-wrap wrap-anywhere text-[14px] text-ink">
                    {note.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
