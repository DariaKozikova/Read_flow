import { Avatar } from '../components/Avatar';
import type { ProfileInput } from '../shared';

export function SignInPage({
  profile,
  onSignIn,
}: {
  profile: ProfileInput;
  onSignIn: () => void;
}) {
  return (
    <main className="loading">
      <section className="onboarding-card" aria-labelledby="sign-in-title">
        <p className="eyebrow">READINGFLOW</p>
        <h1 id="sign-in-title">Вхід до ReadingFlow</h1>
        <div className="sidebar-profile">
          <Avatar value={profile.avatar} />
          <div>
            <strong title={profile.name}>{profile.name}</strong>
            <small>Денна ціль · {profile.dailyGoalMinutes} хв</small>
          </div>
        </div>
        <p>Продовжити з цим профілем?</p>
        <button type="button" className="primary-button" onClick={onSignIn}>
          Увійти
        </button>
      </section>
    </main>
  );
}
