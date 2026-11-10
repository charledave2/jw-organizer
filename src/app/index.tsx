import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTracker } from '../state/TrackerContext';
import { formatClock, formatDayLabel, formatDuration } from '../ui/format';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';
import { getAppSetting, localDateKey, ServiceSession } from '../data/database';

const zeroCounts = { placements: 0, videos: 0, returnVisits: 0, bibleStudies: 0 };

function CountInput({ label, value, onChange }: { label: string; value: number; onChange: (next: number) => void }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.countInputRow}>
      <Text style={styles.countInputLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable accessibilityLabel={`Bawasan ang ${label}`} onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepperButton}><Ionicons name="remove" size={18} color={colors.ink} /></Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable accessibilityLabel={`Dagdagan ang ${label}`} onPress={() => onChange(value + 1)} style={styles.stepperButton}><Ionicons name="add" size={18} color={colors.ink} /></Pressable>
      </View>
    </View>
  );
}

function SessionRow({ session }: { session: ServiceSession }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const count = session.placements + session.videos + session.return_visits + session.bible_studies;
  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionIcon}><Ionicons name="leaf-outline" size={18} color={colors.green} /></View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionDate}>{formatDayLabel(session.service_date)}</Text>
        <Text style={styles.sessionMeta}>{count ? `${session.placements} placement${session.placements === 1 ? '' : 's'} · ${session.return_visits} return visit${session.return_visits === 1 ? '' : 's'}` : 'Field service session'}</Text>
      </View>
      <Text style={styles.sessionDuration}>{formatDuration(session.duration_seconds)}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { sessions, elapsedSeconds, isRunning, ready, start, pause, finish } = useTracker();
  const [logVisible, setLogVisible] = useState(false);
  const [counts, setCounts] = useState(zeroCounts);
  const [profileName, setProfileName] = useState('');
  useEffect(() => { getAppSetting('profile_name', '').then(setProfileName); }, []);
  const today = localDateKey();
  const todaySessions = useMemo(() => sessions.filter((session) => session.service_date === today), [sessions, today]);
  const recentSessions = sessions.slice(0, 4);
  const todaySeconds = todaySessions.reduce((sum, session) => sum + session.duration_seconds, 0) + (isRunning ? elapsedSeconds : 0);
  const todayPlacements = todaySessions.reduce((sum, session) => sum + session.placements, 0);

  const saveLog = async () => {
    await finish(counts);
    setCounts(zeroCounts);
    setLogVisible(false);
  };

  const timerAction = async () => {
    if (isRunning) await pause();
    else await start();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandMark}><Ionicons name="leaf" size={18} color={colors.surface} /></View>
          <Text style={styles.brandName}>JW Organizer</Text>
          <View style={styles.avatar} accessibilityLabel="Profile"><Text style={styles.avatarText}>{profileName.trim().charAt(0).toLocaleUpperCase() || 'P'}</Text></View>
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.eyebrow}>{new Date().toLocaleDateString('fil-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={styles.greeting}>{profileName.trim() ? `Magandang araw, ${profileName.trim()}` : 'Magandang araw'}</Text>
          <Text style={styles.subtitle}>Narito ang buod ng iyong ministry.</Text>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerCardHeader}>
            <View style={styles.timerLabelWrap}><View style={[styles.liveDot, isRunning && styles.liveDotActive]} /><Text style={styles.timerLabel}>{isRunning ? 'TIMER RUNNING' : elapsedSeconds ? 'NA-PAUSE' : 'FIELD SERVICE'}</Text></View>
            <Ionicons name="time-outline" size={18} color={colors.muted} />
          </View>
          <Text style={styles.timerValue}>{formatClock(elapsedSeconds)}</Text>
          <Text style={styles.timerHint}>{isRunning ? 'Nagsusukat ng oras ng paglilingkod' : elapsedSeconds ? 'Ipagpatuloy kapag handa ka na' : 'Handa ka na bang magsimula?'}</Text>
          <View style={styles.timerActions}>
            <Pressable onPress={timerAction} style={[styles.primaryButton, isRunning && styles.secondaryButton]}>
              <Ionicons name={isRunning ? 'pause' : 'play'} size={17} color={isRunning ? colors.green : colors.surface} />
              <Text style={[styles.primaryButtonText, isRunning && styles.secondaryButtonText]}>{isRunning ? 'I-pause' : elapsedSeconds ? 'Ipagpatuloy' : 'Simulan ang timer'}</Text>
            </Pressable>
            {(isRunning || elapsedSeconds > 0) && <Pressable onPress={() => { if (isRunning) pause(); setCounts(zeroCounts); setLogVisible(true); }} style={styles.finishButton}><Text style={styles.finishButtonText}>Tapusin</Text></Pressable>}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ngayong araw</Text>
          <Text style={styles.sectionLink}>Buod</Text>
        </View>
        <View style={styles.statsStrip}>
          <View style={styles.statItem}><Text style={styles.statValue}>{formatDuration(todaySeconds)}</Text><Text style={styles.statLabel}>Oras</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>{todaySessions.length}</Text><Text style={styles.statLabel}>Session</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>{todayPlacements}</Text><Text style={styles.statLabel}>Placement</Text></View>
        </View>

        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          <Text style={styles.sectionTitle}>Kamakailang activity</Text>
          <Pressable onPress={() => router.push('/calendar')}><Text style={styles.sectionLink}>Tingnan lahat</Text></Pressable>
        </View>
        {recentSessions.length ? (
          <View style={styles.sessionList}>{recentSessions.map((session) => <SessionRow key={session.id} session={session} />)}</View>
        ) : (
          <View style={styles.emptyActivity}>
            <View style={styles.emptyIcon}><Ionicons name="time-outline" size={22} color={colors.green} /></View>
            <View style={{ flex: 1 }}><Text style={styles.emptyTitle}>{ready ? 'Wala pang naitatala' : 'Inihahanda ang iyong data…'}</Text><Text style={styles.emptyText}>Lalabas dito ang iyong mga session pagkatapos mong mag-log.</Text></View>
          </View>
        )}
        <Text style={styles.privacyNote}><Ionicons name="lock-closed-outline" size={12} color={colors.muted} />  Naka-save sa device mo</Text>
      </ScrollView>

      <Modal visible={logVisible} animationType="slide" transparent onRequestClose={() => setLogVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalTitleRow}><View><Text style={styles.modalTitle}>I-log ang session</Text><Text style={styles.modalSubtitle}>{formatClock(elapsedSeconds)} · {new Date().toLocaleDateString('fil-PH', { month: 'long', day: 'numeric' })}</Text></View><Pressable onPress={() => setLogVisible(false)} style={styles.closeButton}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
            <Text style={styles.formIntro}>Ilagay ang bilang ng mga nagawa ngayong session.</Text>
            <CountInput label="Placements" value={counts.placements} onChange={(placements) => setCounts({ ...counts, placements })} />
            <CountInput label="Video showings" value={counts.videos} onChange={(videos) => setCounts({ ...counts, videos })} />
            <CountInput label="Return visits" value={counts.returnVisits} onChange={(returnVisits) => setCounts({ ...counts, returnVisits })} />
            <CountInput label="Bible studies" value={counts.bibleStudies} onChange={(bibleStudies) => setCounts({ ...counts, bibleStudies })} />
            <Pressable onPress={saveLog} style={styles.saveButton}><Text style={styles.saveButtonText}>I-save ang session</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 30 },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  brandName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink, letterSpacing: -0.25 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  greetingBlock: { marginTop: 19, marginBottom: 21 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  greeting: { fontSize: 28, color: colors.ink, fontWeight: '700', letterSpacing: -0.9, marginTop: 3 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  timerCard: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.line },
  timerCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  liveDotActive: { backgroundColor: colors.green },
  timerLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  timerValue: { fontSize: 42, letterSpacing: -1.3, color: colors.ink, fontWeight: '500', marginTop: 13, fontVariant: ['tabular-nums'] },
  timerHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  timerActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { backgroundColor: colors.green, height: 46, paddingHorizontal: 17, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: colors.surface, fontWeight: '600', fontSize: 14 },
  secondaryButton: { backgroundColor: colors.greenSoft },
  secondaryButtonText: { color: colors.greenDark },
  finishButton: { height: 46, paddingHorizontal: 17, borderRadius: 15, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  finishButtonText: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  sectionHeader: { marginTop: 25, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.ink, fontWeight: '700', fontSize: 16, letterSpacing: -0.25 },
  sectionLink: { color: colors.green, fontSize: 12, fontWeight: '600' },
  statsStrip: { paddingVertical: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.line },
  sessionList: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 66, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  sessionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  sessionInfo: { flex: 1 },
  sessionDate: { color: colors.ink, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  sessionMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sessionDuration: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  emptyActivity: { flexDirection: 'row', gap: 12, paddingVertical: 18, paddingHorizontal: 15, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  emptyIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  privacyNote: { color: colors.muted, fontSize: 11, alignSelf: 'center', marginTop: 17 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 25, 22, 0.32)' },
  modalSheet: { backgroundColor: colors.surface, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 27, borderTopRightRadius: 27 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 18 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.45 },
  modalSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  closeButton: { height: 34, width: 34, borderRadius: 17, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  formIntro: { fontSize: 13, color: colors.muted, marginTop: 21, marginBottom: 9 },
  countInputRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  countInputLabel: { color: colors.ink, fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  stepperButton: { height: 30, width: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { width: 22, textAlign: 'center', color: colors.ink, fontSize: 14, fontWeight: '600' },
  saveButton: { backgroundColor: colors.green, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  saveButtonText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
});
