import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';
import { groupSlotsByDay, type Slot } from './groupSlots';

export type { Slot } from './groupSlots';

export interface SlotPickerProps {
  slots: Slot[];
  selectedId?: string | null;
  onSelect: (slot: Slot) => void;
  /** Formats a slot's time; defaults to e.g. "9:30 AM". */
  formatTime?: (iso: string) => string;
  emptyLabel?: string;
}

const defaultFormatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Day strip plus a grid of times for the chosen day — a phone-sized stand-in for the web week calendar. */
export function SlotPicker({ slots, selectedId, onSelect, formatTime = defaultFormatTime, emptyLabel = 'No open times' }: SlotPickerProps) {
  const days = useMemo(() => groupSlotsByDay(slots), [slots]);
  const selectedDay = days.find((d) => d.slots.some((s) => s.id === selectedId))?.key;
  const [dayKey, setDayKey] = useState<string | undefined>(selectedDay ?? days[0]?.key);
  const day = days.find((d) => d.key === dayKey) ?? days[0];

  if (!day) return <Text style={styles.empty}>{emptyLabel}</Text>;

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {days.map((d) => {
          const active = d.key === day.key;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${d.weekday} ${d.month} ${d.date}, ${d.slots.length} times`}
              onPress={() => setDayKey(d.key)}
              style={[styles.day, active && styles.dayActive]}
            >
              <Text style={[styles.weekday, active && styles.onActive]}>{d.weekday}</Text>
              <Text style={[styles.date, active && styles.onActive]}>{d.date}</Text>
              <Text style={[styles.month, active && styles.onActive]}>{d.month}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.times}>
        {day.slots.map((s) => {
          const active = s.id === selectedId;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${formatTime(s.startTime)}${s.detail ? ` with ${s.detail}` : ''}`}
              onPress={() => onSelect(s)}
              style={[styles.time, active && styles.timeActive]}
            >
              <Text style={[styles.timeLabel, active && styles.onActive]}>{formatTime(s.startTime)}</Text>
              {s.detail ? <Text style={[styles.timeDetail, active && styles.onActive]} numberOfLines={1}>{s.detail}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space[4] },
  days: { gap: space[2] },
  day: {
    width: 60, paddingVertical: space[2], alignItems: 'center', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekday: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  date: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  month: { fontSize: fontSize.xs, color: colors.textSecondary },
  onActive: { color: colors.textInverse },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  time: {
    width: '31%', paddingVertical: space[2], paddingHorizontal: space[2], alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  timeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  timeDetail: { fontSize: fontSize.xs, color: colors.textSecondary },
  empty: { fontSize: fontSize.base, color: colors.textMuted },
});
