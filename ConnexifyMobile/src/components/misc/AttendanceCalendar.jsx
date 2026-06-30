import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLOR = (theme) => ({
  Present: theme.colors.success,
  Absent:  theme.colors.danger,
  Late:    theme.colors.warning,
  Leave:   theme.colors.accent,
  Holiday: theme.colors.textMuted,
});

const AttendanceCalendar = ({ records = [], year, month, onDayPress, style }) => {
  const { theme } = useTheme();
  const colors = STATUS_COLOR(theme);

  const { year: displayYear, month: displayMonth } = useMemo(() => {
    const now = new Date();
    return { year: year ?? now.getFullYear(), month: month ?? now.getMonth() };
  }, [year, month]);

  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDay    = new Date(displayYear, displayMonth, 1).getDay();

  // Map records by date string YYYY-MM-DD
  const recordMap = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const d = new Date(r.date || r.checkIn || r.createdAt);
      if (!isNaN(d)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        map[key] = r.status || 'Present';
      }
    });
    return map;
  }, [records]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = new Date(displayYear, displayMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const today = new Date();

  const s = styles(theme);

  return (
    <View style={[s.container, style]}>
      <Text style={s.monthLabel}>{monthLabel}</Text>

      {/* Day headers */}
      <View style={s.headerRow}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={s.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={s.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={s.cell} />;

          const dateKey = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status  = recordMap[dateKey];
          const color   = status ? colors[status] : null;
          const isToday =
            today.getFullYear() === displayYear &&
            today.getMonth() === displayMonth &&
            today.getDate() === day;
          const isFuture = new Date(displayYear, displayMonth, day) > today;

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                s.cell,
                isToday && s.todayCell,
                color && { backgroundColor: color + '22', borderRadius: borderRadius.sm },
              ]}
              onPress={() => onDayPress?.({ day, dateKey, status })}
              activeOpacity={onDayPress ? 0.7 : 1}
            >
              <Text style={[
                s.dayNum,
                isToday && s.todayNum,
                isFuture && s.futureNum,
              ]}>
                {day}
              </Text>
              {color && <View style={[s.dot, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={s.legend}>
        {Object.entries(colors).map(([label, color]) => (
          <View key={label} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: color }]} />
            <Text style={s.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container:  { paddingVertical: spacing.sm },
  monthLabel: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  headerRow:  { flexDirection: 'row', marginBottom: spacing.xs },
  dayHeader:  { flex: 1, textAlign: 'center', fontSize: fontSize.xs, color: theme.colors.textMuted, fontWeight: fontWeight.semibold },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width:   `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  todayCell:  { backgroundColor: theme.colors.primaryLight, borderRadius: borderRadius.sm },
  dayNum:     { fontSize: fontSize.sm, color: theme.colors.textPrimary },
  todayNum:   { color: theme.colors.primary, fontWeight: fontWeight.bold },
  futureNum:  { color: theme.colors.textMuted },
  dot:        { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  legend:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendLabel:{ fontSize: fontSize.xs, color: theme.colors.textSecondary },
});

export default AttendanceCalendar;
