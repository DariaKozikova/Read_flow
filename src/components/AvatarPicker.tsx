import { avatars, type Avatar as AvatarValue } from '../shared';
import { Avatar, avatarNames } from './Avatar';

export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarValue;
  onChange: (value: AvatarValue) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.75"
      role="group"
      aria-label="Обери свій аватар"
    >
      {avatars.map((item) => (
        <button
          type="button"
          key={item}
          className={`avatar-choice ${value === item ? 'selected' : ''}`}
          aria-label={avatarNames[item]}
          aria-pressed={value === item}
          onClick={() => onChange(item)}
        >
          <Avatar value={item} />
        </button>
      ))}
    </div>
  );
}
