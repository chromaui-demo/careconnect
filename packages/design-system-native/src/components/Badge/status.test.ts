import { describe, expect, it } from 'vitest';
import { appointmentStatusBadge, formatStatusLabel } from './status';

describe('appointment status helpers', () => {
  it('maps known statuses to their own variant', () => {
    expect(appointmentStatusBadge('prebooked')).toBe('prebooked');
    expect(appointmentStatusBadge('in-office')).toBe('in-office');
    expect(appointmentStatusBadge('completed')).toBe('completed');
    expect(appointmentStatusBadge('cancelled')).toBe('cancelled');
  });

  it('falls back to default for unknown statuses', () => {
    expect(appointmentStatusBadge('no-show')).toBe('default');
  });

  it('title-cases hyphenated statuses', () => {
    expect(formatStatusLabel('in-office')).toBe('In Office');
    expect(formatStatusLabel('prebooked')).toBe('Prebooked');
  });
});
