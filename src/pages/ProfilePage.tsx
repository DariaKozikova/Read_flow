import { useState, type FormEvent } from 'react';
import { Avatar } from '../components/Avatar';
import type { ProfileInput } from '../shared';

export function ProfilePage({
  profile,
  onSaved,
}: {
  profile: ProfileInput;
  onSaved: (profile: ProfileInput) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [goal, setGoal] = useState(String(profile.dailyGoalMinutes));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'saved' | 'invalid-name' | 'error'>();

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
          <Avatar value={profile.avatar} large />
          <div className="min-w-0 flex-1">
            <h2
              id="profile-details"
              className="m-0 wrap-anywhere text-[24px] font-semibold"
            >
              {profile.name}
            </h2>
            <p className="m-0 mt-1 text-[13px] text-ink">
              Денна ціль · {profile.dailyGoalMinutes} хв
            </p>
          </div>
        </div>
        {!editing && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-[13px] hover:bg-soft"
              onClick={() => {
                setName(profile.name);
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
    </section>
  );
}
