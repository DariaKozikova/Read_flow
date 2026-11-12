import type { Theme } from '../shared';
export function ThemePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: Theme;
  onChange: (theme: Theme) => void;
  disabled?: boolean;
}) {
  return (
    <div className="theme-picker" role="group" aria-label="Тема оформлення">
      {(['light', 'dark'] as const).map((theme) => (
        <button
          key={theme}
          type="button"
          disabled={disabled}
          aria-pressed={value === theme}
          onClick={() => onChange(theme)}
        >
          <span aria-hidden="true">{theme === 'light' ? '☀' : '☾'}</span>{' '}
          {theme === 'light' ? 'Світла' : 'Темна'}
        </button>
      ))}
    </div>
  );
}
