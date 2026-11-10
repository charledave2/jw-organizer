import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { localDateKey, ServiceSession } from '../data/database';
import { useTracker } from '../state/TrackerContext';
import { formatDayLabel, formatDuration } from '../ui/format';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const monthLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const dateKey = (year: number, month: number, day: number) => `${year}-${`${month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;

export default function CalendarScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { sessions } = useTracker();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [...Array(mondayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const byDate = useMemo(() => sessions.reduce<Record<string, ServiceSession[]>>((map, session) => {
    map[session.service_date] = [...(map[session.service_date] ?? []), session];
    return map;
  }, {}), [sessions]);
  const selectedSessions = byDate[selectedDate] ?? [];
  const selectedTotal = selectedSessions.reduce((sum, item) => sum + item.duration_seconds, 0);
  const moveMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setVisibleMonth(next);
    setSelectedDate(dateKey(next.getFullYear(), next.getMonth(), 1));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.heading}>Calendar</Text><Pressable accessibilityLabel="Go to today" onPress={() => { setVisibleMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelectedDate(localDateKey()); }} style={styles.todayButton}><Text style={styles.todayText}>Today</Text></Pressable></View>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}><Pressable onPress={() => moveMonth(-1)} style={styles.arrowButton}><Ionicons name="chevron-back" size={18} color={colors.ink} /></Pressable><Text style={styles.monthText}>{monthLabel(visibleMonth)}</Text><Pressable onPress={() => moveMonth(1)} style={styles.arrowButton}><Ionicons name="chevron-forward" size={18} color={colors.ink} /></Pressable></View>
          <View style={styles.weekRow}>{weekdays.map((day, i) => <Text key={`${day}-${i}`} style={styles.weekday}>{day}</Text>)}</View>
          <View style={styles.daysGrid}>{cells.map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const key = dateKey(year, month, day);
            const isSelected = key === selectedDate;
            const isToday = key === localDateKey();
            const hasActivity = Boolean(byDate[key]?.length);
            return <Pressable key={key} onPress={() => setSelectedDate(key)} style={styles.dayCell}>
              <View style={[styles.dayCircle, isSelected && styles.selectedCircle, isToday && !isSelected && styles.todayCircle]}><Text style={[styles.dayText, isSelected && styles.selectedDayText, isToday && !isSelected && styles.todayDayText]}>{day}</Text></View>
              <View style={[styles.dayDot, hasActivity && styles.dayDotActive]} />
            </Pressable>;
          })}</View>
          <View style={styles.legend}><View style={styles.legendDot} /><Text style={styles.legendText}>May activity</Text></View>
        </View>

        <View style={styles.daySummaryHeader}><View><Text style={styles.daySummaryTitle}>{formatDayLabel(selectedDate)}</Text><Text style={styles.daySummaryCaption}>{selectedSessions.length ? `${selectedSessions.length} session${selectedSessions.length === 1 ? '' : 's'} · ${formatDuration(selectedTotal)}` : 'No activity recorded'}</Text></View><View style={styles.dayBadge}><Ionicons name="sunny-outline" size={17} color={colors.green} /></View></View>
        {selectedSessions.length ? selectedSessions.map((item) => <View key={item.id} style={styles.sessionCard}><View style={styles.sessionIcon}><Ionicons name="leaf-outline" size={18} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={styles.sessionTitle}>Field service</Text><Text style={styles.sessionMeta}>{item.placements} placements · {item.return_visits} return visits</Text></View><Text style={styles.sessionDuration}>{formatDuration(item.duration_seconds)}</Text></View>) : <View style={styles.emptyCard}><Ionicons name="calendar-clear-outline" size={22} color={colors.muted} /><Text style={styles.emptyText}>Nothing has been logged for this day yet.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 30 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6, color: colors.ink },
  todayButton: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 14, backgroundColor: colors.greenSoft },
  todayText: { color: colors.greenDark, fontSize: 12, fontWeight: '700' },
  calendarCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, marginTop: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  monthText: { fontSize: 15, fontWeight: '700', color: colors.ink, textTransform: 'capitalize' },
  arrowButton: { height: 34, width: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  weekRow: { flexDirection: 'row', marginTop: 5, marginBottom: 4 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 45, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  selectedCircle: { backgroundColor: colors.green },
  todayCircle: { borderWidth: 1, borderColor: colors.green },
  dayText: { color: colors.ink, fontSize: 13 },
  selectedDayText: { color: colors.surface, fontWeight: '700' },
  todayDayText: { color: colors.greenDark, fontWeight: '700' },
  dayDot: { height: 4, width: 4, borderRadius: 2, marginTop: 2 },
  dayDotActive: { backgroundColor: colors.orange },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'center' },
  legendDot: { backgroundColor: colors.orange, height: 5, width: 5, borderRadius: 3 },
  legendText: { fontSize: 10, color: colors.muted },
  daySummaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 13 },
  daySummaryTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  daySummaryCaption: { color: colors.muted, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  dayBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 14, marginBottom: 9 },
  sessionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  sessionTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
  sessionMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  sessionDuration: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  emptyCard: { minHeight: 96, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyText: { color: colors.muted, fontSize: 12 },
});
