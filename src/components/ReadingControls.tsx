import type { FormEvent } from 'react';
import type { ActiveReading, Book } from '../shared';
import { ReadingTimer } from './ReadingTimer';

export function ReadingControls({
  book,
  active,
  expanded,
  busy,
  error,
  onSubmit,
  onTogglePause,
  onCancel,
  onOpen,
}: {
  book: Book;
  active: ActiveReading | null;
  expanded: boolean;
  busy: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTogglePause: () => void;
  onCancel: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      {expanded ? (
        <form
          key={active ? 'finish' : 'start'}
          className="mt-3 grid gap-2"
          onSubmit={(event) => void onSubmit(event)}
        >
          {active && <ReadingTimer session={active} />}
          {active && (
            <button
              type="button"
              className="rounded-control border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
              disabled={busy}
              onClick={onTogglePause}
            >
              {active.runningSince === null ? 'Продовжити читання' : 'Пауза'}
            </button>
          )}
          <label className="grid gap-1 text-[13px]">
            {active ? 'Кінцева сторінка' : 'Початкова сторінка'}
            <input
              name="page"
              type="number"
              min={active?.startPage ?? 1}
              max={book.total_pages}
              defaultValue={active?.startPage ?? Math.max(1, book.current_page)}
              required
              disabled={busy}
            />
          </label>
          <button className="primary-button" disabled={busy}>
            {active ? 'Завершити читання' : 'Почати читання'}
          </button>
          {!active && (
            <button type="button" disabled={busy} onClick={() => onCancel()}>
              Скасувати
            </button>
          )}
          {error && (
            <p className="error m-0" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          className="primary-button mt-3"
          disabled={!!active || busy}
          onClick={() => {
            onOpen();
          }}
        >
          Читати
        </button>
      )}
    </>
  );
}
