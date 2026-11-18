import { useReadingSummary } from '../useReadingSummary';

export function HomePage({ dailyGoal }: { dailyGoal: number }) {
  const { summary, retry } = useReadingSummary();

  const minutes = (summary?.milliseconds ?? 0) / 60_000;
  return (
    <section className="flex-1 py-6" aria-labelledby="today-reading">
      <div className="max-w-[720px] border-b border-border py-2 pb-6">
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
              className="rounded-control border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
              onClick={retry}
            >
              Спробувати ще раз
            </button>
          </>
        ) : (
          <>
            <dl className="m-0 mb-5 flex flex-wrap gap-x-10 gap-y-2">
              <div>
                <dt className="text-[12px] text-muted">Хвилини читання</dt>
                <dd className="m-0 text-[22px] font-semibold">
                  {Math.floor(minutes)}
                </dd>
              </div>
              <div>
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
