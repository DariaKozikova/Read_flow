import { useEffect, useState } from 'react';
import type { ActiveReading } from '../shared';

export function ReadingTimer({ session }: { session: ActiveReading }) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (session.runningSince === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [session.runningSince]);

  const elapsed =
    session.accumulatedMs +
    (session.runningSince === null
      ? 0
      : Math.max(0, now - session.runningSince));
  const seconds = Math.floor(elapsed / 1000);
  const display = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');

  return (
    <p className="m-0 rounded-control bg-soft px-3 py-2 text-[13px] text-ink">
      Сторінка початку: {session.startPage} ·{' '}
      <span role="timer" className="font-semibold tabular-nums">
        {display}
      </span>
    </p>
  );
}
