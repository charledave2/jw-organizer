import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTracker } from '../state/TrackerContext';
import { formatDuration } from '../ui/format';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';

function MetricRow({ icon, label, value, tint }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tint?: string }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return <View style={styles.metricRow}><View style={[styles.metricIcon, tint ? { backgroundColor: tint } : null]}><Ionicons name={icon} size={18} color={colors.green} /></View><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { sessions } = useTracker();
  const [monthOffset, setMonthOffset] = useState(0);
  const selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthSessions = useMemo(() => sessions.filter((session) => {
    const day = new Date(`${session.service_date}T12:00:00`);
    return day.getFullYear() === selectedMonth.getFullYear() && day.getMonth() === selectedMonth.getMonth();
  }), [sessions, selectedMonth.getFullYear(), selectedMonth.getMonth()]);
  const totals = monthSessions.reduce((result, item) => ({
    seconds: result.seconds + item.duration_seconds,
    placements: result.placements + item.placements,
    videos: result.videos + item.videos,
    returnVisits: result.returnVisits + item.return_visits,
    bibleStudies: result.bibleStudies + item.bible_studies,
  }), { seconds: 0, placements: 0, videos: 0, returnVisits: 0, bibleStudies: 0 });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.heading}>Report</Text></View>
        <View style={styles.monthSelector}><Pressable accessibilityLabel="Previous month" onPress={() => setMonthOffset(monthOffset - 1)} style={styles.monthArrow}><Ionicons name="chevron-back" size={17} color={colors.ink} /></Pressable><Text style={styles.monthLabel}>{monthName}</Text><Pressable accessibilityLabel="Next month" onPress={() => setMonthOffset(monthOffset + 1)} style={styles.monthArrow}><Ionicons name="chevron-forward" size={17} color={colors.ink} /></Pressable></View>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}><Text style={styles.heroEyebrow}>KABUUANG ORAS</Text><View style={styles.heroIcon}><Ionicons name="time-outline" size={18} color={colors.surface} /></View></View>
          <Text style={styles.heroValue}>{formatDuration(totals.seconds)}</Text>
          <Text style={styles.heroCaption}>{monthSessions.length} service session{monthSessions.length === 1 ? '' : 's'} ngayong buwan</Text>
          <View style={styles.heroRule} />
          <View style={styles.heroFoot}><Ionicons name="lock-closed-outline" size={12} color={colors.surface} /><Text style={styles.heroFootText}>Personal report · Saved only on this device</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Activity</Text><Text style={styles.privateLabel}>THIS MONTH</Text></View>
        <View style={styles.metricsCard}>
          <MetricRow icon="book-outline" label="Placements" value={`${totals.placements}`} />
          <View style={styles.divider} />
          <MetricRow icon="play-circle-outline" label="Video showings" value={`${totals.videos}`} />
          <View style={styles.divider} />
          <MetricRow icon="repeat-outline" label="Return visits" value={`${totals.returnVisits}`} />
          <View style={styles.divider} />
          <MetricRow icon="people-outline" label="Bible studies" value={`${totals.bibleStudies}`} />
        </View>

        <View style={styles.noteRow}><Ionicons name="information-circle-outline" size={18} color={colors.muted} /><Text style={styles.noteText}>This report is based on the sessions you logged.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 30 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6, color: colors.ink },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 25, marginTop: 12, marginBottom: 15 },
  monthArrow: { height: 34, width: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  monthLabel: { color: colors.ink, fontWeight: '600', fontSize: 14, textTransform: 'capitalize', minWidth: 130, textAlign: 'center' },
  heroCard: { backgroundColor: colors.green, borderRadius: 23, padding: 21 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroEyebrow: { fontSize: 10, color: colors.surface, letterSpacing: 1.2, fontWeight: '700' },
  heroIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  heroValue: { fontSize: 34, fontWeight: '700', color: colors.surface, letterSpacing: -0.8, marginTop: 15 },
  heroCaption: { fontSize: 12, color: colors.surface, marginTop: 3 },
  heroRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 20, marginBottom: 13 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroFootText: { fontSize: 10, color: colors.surface },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 11 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  privateLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  metricsCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 19, paddingHorizontal: 15 },
  metricRow: { minHeight: 57, flexDirection: 'row', alignItems: 'center' },
  metricIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  metricLabel: { flex: 1, color: colors.ink, fontSize: 13 },
  metricValue: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 45 },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 18, paddingHorizontal: 2 },
  noteText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
});
