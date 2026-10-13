import { describe, expect, it } from 'vitest';
import { groupSlotsByDay } from './groupSlots';

describe('groupSlotsByDay', () => {
  it('groups by local day and sorts days and times', () => {
    const days = groupSlotsByDay([
      { id: 'c', startTime: new Date(2026, 9, 15, 9, 0).toISOString() },
      { id: 'b', startTime: new Date(2026, 9, 14, 13, 30).toISOString() },
      { id: 'a', startTime: new Date(2026, 9, 14, 9, 30).toISOString() },
    ]);
    expect(days.map((d) => [d.weekday, d.date, d.month, d.slots.map((s) => s.id)])).toEqual([
      ['Wed', 14, 'Oct', ['a', 'b']],
      ['Thu', 15, 'Oct', ['c']],
    ]);
  });

  it('returns no days for no slots', () => {
    expect(groupSlotsByDay([])).toEqual([]);
  });
});
