import { useEffect, useState } from 'react';
import { summarizeReading } from '../readingSummary';

export function HomePage({ dailyGoal }: { dailyGoal: number }) {
  const [summary, setSummary] = useState<ReturnType<
    typeof summarizeReading
  > | null>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );
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

  const minutes = (summary?.milliseconds ?? 0) / 60_000;
  return (
    <section className="flex-1 py-6" aria-labelledby="today-reading">
      <div className="max-w-[560px] rounded-[16px] border border-border bg-surface p-5">
        <h2 id="today-reading" className="mb-3 text-[20px] font-semibold">
          Читання сьогодні
        </h2>
        {summary === undefined ? (
          <p role="status" className="m-0 text-[13px]">
            Завантажуємо підсумок…
          </p>
        ) : summary === null ? (
          <>
            <p role="alert" className="text-[13px]">
              Не вдалося завантажити підсумок.
            </p>
            <button
              type="button"
              className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
              onClick={() => {
                setSummary(undefined);
                setAttempt((value) => value + 1);
              }}
            >
              Спробувати ще раз
            </button>
          </>
        ) : (
          <>
            <dl className="m-0 mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-[8px] bg-canvas p-3">
                <dt className="text-[12px] text-muted">Хвилини читання</dt>
                <dd className="m-0 text-[22px] font-semibold">
                  {Math.floor(minutes)}
                </dd>
              </div>
              <div className="rounded-[8px] bg-canvas p-3">
                <dt className="text-[12px] text-muted">Книг читали</dt>
                <dd className="m-0 text-[22px] font-semibold">
                  {summary.bookCount}
                </dd>
              </div>
            </dl>
            <label className="grid gap-1.5 text-[13px]">
              Денна ціль · {Math.floor(minutes)} із {dailyGoal} хв
              <progress
                className="h-2 w-full accent-accent"
                max={dailyGoal}
                value={Math.min(minutes, dailyGoal)}
              />
            </label>
          </>
        )}
      </div>
    </section>
  );
}
