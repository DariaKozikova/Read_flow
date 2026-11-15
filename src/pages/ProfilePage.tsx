import { useState, type FormEvent } from 'react';
import { Avatar } from '../components/Avatar';
import { AvatarPicker } from '../components/AvatarPicker';
import type { ProfileInput } from '../shared';
import { useReadingSummary } from '../useReadingSummary';

export function ProfilePage({
  profile,
  onSaved,
}: {
  profile: ProfileInput;
  onSaved: (profile: ProfileInput) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [goal, setGoal] = useState(String(profile.dailyGoalMinutes));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'saved' | 'invalid-name' | 'error'>();
  const { summary, retry } = useReadingSummary();
  const { summary: weekly, retry: retryWeekly } = useReadingSummary(7);
  const minutes = (summary?.milliseconds ?? 0) / 60_000;
  const remaining = Math.max(0, profile.dailyGoalMinutes - Math.floor(minutes));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setResult('invalid-name');
      return;
    }
    setSaving(true);
    setResult(undefined);
    try {
      const updated = await window.api.updateProfile({
        name: name.trim(),
        avatar,
        dailyGoalMinutes: Number(goal),
      });
      onSaved(updated);
      setEditing(false);
      setResult('saved');
    } catch {
      setResult('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex-1 py-6" aria-labelledby="profile-details">
      <div className="max-w-[640px] rounded-[20px] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-4 rounded-[14px] bg-soft p-4">
          <Avatar value={editing ? avatar : profile.avatar} large />
          <div className="min-w-0 flex-1">
            <h2
              id="profile-details"
              className="m-0 wrap-anywhere text-[24px] font-semibold"
            >
              {profile.name}
            </h2>
          </div>
        </div>
        {!editing && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
              onClick={() => {
                setName(profile.name);
                setAvatar(profile.avatar);
                setGoal(String(profile.dailyGoalMinutes));
                setResult(undefined);
                setEditing(true);
              }}
            >
              Редагувати профіль
            </button>
            {result === 'saved' && (
              <p role="status" className="m-0 text-[13px] text-accent">
                Зміни збережено.
              </p>
            )}
          </div>
        )}
        {editing && (
          <form
            aria-label="Редагування профілю"
            className="mt-4 border-t border-border pt-4"
            onSubmit={submit}
            onChange={() => setResult(undefined)}
          >
            <fieldset disabled={saving} className="grid gap-3">
              <div className="grid gap-1 text-[13px]">
                Обери свій аватар
                <AvatarPicker
                  value={avatar}
                  onChange={(value) => {
                    setAvatar(value);
                    setResult(undefined);
                  }}
                />
              </div>
              <label className="grid gap-1 text-[13px]">
                Ім’я
                <input
                  required
                  maxLength={60}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-[13px]">
                Денна ціль, хв
                <input
                  type="number"
                  required
                  min={1}
                  max={1440}
                  step={1}
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                />
              </label>
              <button className="primary-button">
                {saving ? 'Зберігаємо…' : 'Зберегти зміни'}
              </button>
              <button
                type="button"
                className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
                onClick={() => setEditing(false)}
              >
                Скасувати
              </button>
            </fieldset>
            {(result === 'error' || result === 'invalid-name') && (
              <p role="alert" className="error m-0 mt-3">
                {result === 'invalid-name'
                  ? 'Введи своє ім’я.'
                  : 'Не вдалося зберегти зміни. Спробуй ще раз.'}
              </p>
            )}
          </form>
        )}
      </div>
      <section
        className="mt-4 max-w-[640px] rounded-[20px] border border-border bg-surface p-5"
        aria-labelledby="profile-daily-goal"
      >
        <h2 id="profile-daily-goal" className="mb-3 text-[18px] font-semibold">
          Денна ціль
        </h2>
        {summary === undefined ? (
          <p role="status" className="m-0 text-[13px]">
            Завантажуємо прогрес…
          </p>
        ) : summary === null ? (
          <>
            <p role="alert" className="text-[13px]">
              Не вдалося завантажити прогрес.
            </p>
            <button
              type="button"
              className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
              onClick={retry}
            >
              Спробувати ще раз
            </button>
          </>
        ) : (
          <>
            <label className="grid gap-2 text-[13px]">
              {Math.floor(minutes)} із {profile.dailyGoalMinutes} хв сьогодні
              <progress
                className="h-2 w-full accent-accent"
                max={profile.dailyGoalMinutes}
                value={Math.min(minutes, profile.dailyGoalMinutes)}
              />
            </label>
            <p className="m-0 mt-2 text-[13px] text-muted">
              {remaining === 0
                ? 'Денну ціль виконано'
                : `До денної цілі залишилося ${remaining} хв`}
            </p>
          </>
        )}
      </section>
      <section
        className="mt-4 max-w-[640px] rounded-[20px] border border-border bg-surface p-5"
        aria-labelledby="profile-weekly-reading"
      >
        <h2
          id="profile-weekly-reading"
          className="mb-3 text-[18px] font-semibold"
        >
          Читання за останні 7 днів
        </h2>
        {weekly === undefined ? (
          <p role="status" className="m-0 text-[13px]">
            Завантажуємо підсумок…
          </p>
        ) : weekly === null ? (
          <>
            <p role="alert" className="text-[13px]">
              Не вдалося завантажити підсумок.
            </p>
            <button
              type="button"
              className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
              onClick={retryWeekly}
            >
              Спробувати ще раз
            </button>
          </>
        ) : (
          <dl className="m-0 grid grid-cols-3 gap-2">
            {[
              {
                label: 'Хвилини читання',
                value: Math.floor(weekly.milliseconds / 60_000),
              },
              { label: 'Дні з читанням', value: weekly.dayCount },
              { label: 'Книг читали', value: weekly.bookCount },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[8px] bg-canvas p-3">
                <dt className="text-[12px] text-muted">{label}</dt>
                <dd className="m-0 text-[22px] font-semibold tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </section>
  );
}
