import type { CalendarEntry } from './shared';

export function summarizeReading(entries: CalendarEntry[]) {
  const books = new Set<number>();
  let milliseconds = 0;
  for (const entry of entries) {
    if (entry.status !== 'read') continue;
    books.add(entry.bookId);
    milliseconds += Math.round(entry.minutes * 60_000);
  }
  return { milliseconds, bookCount: books.size };
}
