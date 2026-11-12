import { useState, type FormEvent } from 'react';
import { avatars, type ProfileInput, type Theme } from '../shared';
import { Avatar, avatarNames } from '../components/Avatar';
import { ThemePicker } from '../components/ThemePicker';
export function OnboardingPage({
  onCreate,
  theme,
  onThemeChange,
  savingTheme,
}: {
  onCreate: (input: ProfileInput) => Promise<void>;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  savingTheme: boolean;
}) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<ProfileInput['avatar']>('leaf');
  const [goal, setGoal] = useState('30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Введи своє ім’я.');
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        avatar,
        dailyGoalMinutes: Number(goal),
      });
    } catch {
      setError('Не вдалося створити профіль. Перевір дані та спробуй ще раз.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <div className="brand">
          <span className="brand-mark">▥</span>ReadingFlow
        </div>
        <ThemePicker
          value={theme}
          onChange={onThemeChange}
          disabled={savingTheme}
        />
      </header>
      <main className="welcome-layout">
        <section className="welcome-copy">
          <span className="eyebrow">ОДНА СТОРІНКА ЗА РАЗ</span>
          <h1>
            Твої книги.
            <br />
            Твій темп.
            <br />
            <em>Твоя історія.</em>
          </h1>
          <p>
            Знайди місце для читання у своєму дні.
            <br />
            Почнемо з маленького знайомства.
          </p>
          <div className="book-art" aria-hidden="true">
            <div className="art-orbit" />
            <div className="art-book back">тиша</div>
            <div className="art-book front">
              <span>
                READ
                <br />
                YOUR
                <br />
                WORLD
              </span>
              <small>ReadingFlow</small>
            </div>
            <span className="art-star">✦</span>
          </div>
          <p className="welcome-footnote">
            Особистий простір, що завжди поруч.
          </p>
        </section>
        <section className="onboarding-card">
          <div className="step-label">
            ПЕРШЕ ЗНАЙОМСТВО <span>01 / 01</span>
          </div>
          <h2>Створімо твій профіль</h2>
          <p>Лише кілька деталей — і можна починати.</p>
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <legend className="sr-only">Дані профілю</legend>
              <label className="field-label" htmlFor="profile-name">
                Як тебе звати?
              </label>
              <input
                id="profile-name"
                autoComplete="given-name"
                placeholder="Твоє ім’я"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                required
                autoFocus
              />
              <div className="field-label" id="avatar-label">
                Обери свій аватар
              </div>
              <div
                className="avatar-options"
                role="group"
                aria-labelledby="avatar-label"
              >
                {avatars.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={`avatar-choice ${avatar === item ? 'selected' : ''}`}
                    aria-label={avatarNames[item]}
                    aria-pressed={avatar === item}
                    onClick={() => setAvatar(item)}
                  >
                    <Avatar value={item} />
                  </button>
                ))}
              </div>
              <label className="field-label" htmlFor="daily-goal">
                Твоя денна ціль
              </label>
              <div className="goal-input">
                <input
                  id="daily-goal"
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  required
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                />
                <span>хвилин читання</span>
              </div>
              <div className="goal-presets">
                {[15, 30, 45, 60].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={Number(goal) === value}
                    onClick={() => setGoal(String(value))}
                  >
                    {value} хв
                  </button>
                ))}
              </div>
              <p className="field-hint">
                Навіть 15 хвилин — уже гарний початок.
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary-button" disabled={busy || savingTheme}>
                {busy ? 'Створюємо профіль…' : 'Створити профіль'}
                <span aria-hidden="true">→</span>
              </button>
            </fieldset>
          </form>
          <p className="privacy-note">
            <span aria-hidden="true">⌑</span> Профіль зберігається лише на цьому
            пристрої.
            <br />
            Email і пароль не потрібні.
          </p>
        </section>
      </main>
    </div>
  );
}
