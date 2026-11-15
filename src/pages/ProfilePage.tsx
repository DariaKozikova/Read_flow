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
      setName(updated.name);
      setGoal(String(updated.dailyGoalMinutes));
      onSaved(updated);
      setResult('saved');
    } catch {
      setResult('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex-1 py-6" aria-labelledby="profile-details">
      <form
        className="max-w-[480px] rounded-[16px] border border-border bg-surface p-5"
        onSubmit={submit}
        onChange={() => setResult(undefined)}
      >
        <div className="mb-4 flex items-center gap-3">
          <Avatar value={profile.avatar} />
          <h2 id="profile-details" className="m-0 text-[18px] font-semibold">
            Дані профілю
          </h2>
        </div>
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
        </fieldset>
        {result === 'saved' && (
          <p role="status" className="m-0 mt-3 text-[13px] text-accent">
            Зміни збережено.
          </p>
        )}
        {(result === 'error' || result === 'invalid-name') && (
          <p role="alert" className="error m-0 mt-3">
            {result === 'invalid-name'
              ? 'Введи своє ім’я.'
              : 'Не вдалося зберегти зміни. Спробуй ще раз.'}
          </p>
        )}
      </form>
    </section>
  );
}
