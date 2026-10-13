// No react-native imports: unit-tested under plain Node.
export interface Slot {
  id: string;
  startTime: string;
  /** Secondary line under the time, e.g. the provider. */
  detail?: string;
}

export interface SlotDay {
  key: string;
  weekday: string;
  date: number;
  month: string;
  slots: Slot[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Groups slots by local calendar day, days and times in ascending order. */
export function groupSlotsByDay(slots: Slot[]): SlotDay[] {
  const byDay = new Map<string, SlotDay>();
  for (const slot of [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
    const d = new Date(slot.startTime);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let day = byDay.get(key);
    if (!day) {
      day = { key, weekday: WEEKDAYS[d.getDay()], date: d.getDate(), month: MONTHS[d.getMonth()], slots: [] };
      byDay.set(key, day);
    }
    day.slots.push(slot);
  }
  return [...byDay.values()];
}
