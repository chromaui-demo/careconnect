import clsx from 'clsx';
import './Avatar.css';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  // Fills carry white initials, so each keeps 4.5:1 against white in both themes.
  // Purple has no token; the gold is the light --cc-warning-text shade.
  const colors = [
    'var(--cc-primary)',
    'var(--cc-info)',
    'var(--cc-success)',
    'var(--cc-accent)',
    '#6D28D9',
    '#8A6508',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, size = 'md', src }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx('cc-avatar', `cc-avatar--${size}`)}
      />
    );
  }

  return (
    <span
      className={clsx('cc-avatar', `cc-avatar--${size}`)}
      style={{ background: getColorFromName(name) }}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}

export function PatientAvatar({ patient, size = 'md' }: { patient: { firstName: string; lastName: string }; size?: 'sm' | 'md' | 'lg' }) {
  return <Avatar name={`${patient.firstName} ${patient.lastName}`} size={size} />;
}
