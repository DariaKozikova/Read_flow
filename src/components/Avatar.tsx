import type { Avatar as AvatarType } from '../shared';
export const avatarSymbols: Record<AvatarType, string> = {
  leaf: '❧',
  moon: '☾',
  sun: '☀',
  flower: '✿',
  book: '▤',
  star: '✦',
};
export const avatarNames: Record<AvatarType, string> = {
  leaf: 'Листок',
  moon: 'Місяць',
  sun: 'Сонце',
  flower: 'Квітка',
  book: 'Книга',
  star: 'Зірка',
};
export function Avatar({
  value,
  large = false,
}: {
  value: AvatarType;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar avatar-${value}${large ? ' avatar-large' : ''}`}
      aria-label={avatarNames[value]}
    >
      {avatarSymbols[value]}
    </span>
  );
}
