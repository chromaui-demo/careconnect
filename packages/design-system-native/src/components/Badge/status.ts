// Kept free of react-native imports so the helpers unit-test under plain Node.
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'prebooked' | 'in-office' | 'completed' | 'cancelled';

/** Maps an appointment status to its badge variant (same as the web design system). */
export function appointmentStatusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    prebooked: 'prebooked',
    'in-office': 'in-office',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return map[status] ?? 'default';
}

/** `in-office` → `In Office`. */
export function formatStatusLabel(status: string): string {
  return status
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
