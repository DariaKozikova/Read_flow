import { useEffect, useState } from 'react';
import { summarizeReading } from './readingSummary';

export function useTodayReading() {
  const [summary, setSummary] = useState<ReturnType<
    typeof summarizeReading
  > | null>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const start = new Date(year, month, day);
    const end = new Date(year, month, day + 1);
    window.api
      .listCalendarEntries(start.getTime(), end.getTime())
      .then((entries) => {
        if (current) setSummary(summarizeReading(entries));
      })
      .catch(() => {
        if (current) setSummary(null);
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  function retry() {
    setSummary(undefined);
    setAttempt((value) => value + 1);
  }

  return { summary, retry };
}
