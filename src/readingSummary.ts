import type { CalendarEntry } from './shared';

export function summarizeReading(entries: CalendarEntry[]) {
  const books = new Set<number>();
  const days = new Set<number>();
  let milliseconds = 0;
  let pages = 0;
  for (const entry of entries) {
    if (entry.status !== 'read') continue;
    books.add(entry.bookId);
    const date = new Date(entry.startsAt);
    days.add(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(),
    );
    milliseconds += Math.round(entry.minutes * 60_000);
    if (entry.endPage !== null) {
      pages += Math.max(0, entry.endPage - entry.startPage);
    }
  }
  return { milliseconds, pages, bookCount: books.size, dayCount: days.size };
}
