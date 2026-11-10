import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAppSetting, getReminders, Reminder, removeReminder, saveReminder, setReminderCompleted, setReminderNotificationId } from '../data/database';
import { cancelReminderNotification, requestReminderPermission, scheduleReminderNotification } from '../data/notifications';
import { FilterRow, SearchInput } from '../ui/SearchFilters';
import { DateField, TimeField } from '../ui/DateTimeFields';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';
import { plainText, RichTextEditor, RichTextPreview } from '../ui/RichTextEditor';

type Category = Reminder['category'];
type Filter = 'all' | 'upcoming' | 'completed' | 'overdue';
const categories: Category[] = ['Ministry', 'Personal study', 'Return visit', 'Other'];
const dateKey = () => { const d = new Date(); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`; };
const timeKey = () => `${`${new Date().getHours()}`.padStart(2, '0')}:${`${new Date().getMinutes()}`.padStart(2, '0')}`;
const blank = () => ({ title: '', reminder_date: dateKey(), reminder_time: timeKey(), category: 'Ministry' as Category, details: '' });
const dateTime = (item: Pick<Reminder, 'reminder_date' | 'reminder_time'>) => new Date(`${item.reminder_date}T${item.reminder_time}:00`);
const isValidDateKey = (value: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [y, m, d] = value.split('-').map(Number); const date = new Date(y, m - 1, d); return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d; };
const dateLabel = (item: Pick<Reminder, 'reminder_date' | 'reminder_time'>) => { const [y, m, d] = item.reminder_date.split('-').map(Number); return `${new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${item.reminder_time}`; };

export default function RemindersScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [items, setItems] = useState<Reminder[]>([]);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState(blank());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const refresh = useCallback(async () => setItems(await getReminders()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => items.filter((item) => {
    const q = query.trim().toLocaleLowerCase();
    const matchesQuery = !q || [item.title, plainText(item.details), item.category].some((value) => value.toLocaleLowerCase().includes(q));
    const overdue = !item.completed && dateTime(item).getTime() < Date.now();
    const matchesFilter = filter === 'all' || (filter === 'completed' ? Boolean(item.completed) : filter === 'overdue' ? overdue : !item.completed && !overdue);
    return matchesQuery && matchesFilter;
  }), [items, query, filter]);

  const openNew = () => { setEditing(null); setForm(blank()); setError(''); setVisible(true); };
  const openEdit = (item: Reminder) => { setEditing(item); setForm({ title: item.title, reminder_date: item.reminder_date, reminder_time: item.reminder_time, category: item.category, details: item.details }); setError(''); setVisible(true); };
  const save = async () => {
    if (!form.title.trim()) { setError('Enter a reminder title.'); return; }
    if (!isValidDateKey(form.reminder_date)) { setError('Choose a valid date.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.reminder_time)) { setError('Enter the time in 24-hour format, such as 09:30.'); return; }

    const previous = editing?.notification_id ?? '';
    if (previous) await cancelReminderNotification(previous);
    const saved = await saveReminder({ ...form, title: form.title.trim() }, editing?.id);
    if (saved) {
      await setReminderNotificationId(saved.id, '');
      const enabled = (await getAppSetting('reminder_notifications_enabled', '1')) === '1';
      if (enabled) {
        const permission = await requestReminderPermission();
        if (permission.granted && !saved.completed) {
          const id = await scheduleReminderNotification(saved);
          setFeedback(id ? 'Reminder and notification saved.' : 'Reminder saved. Its time has passed, so no notification was scheduled.');
        } else {
          await setReminderNotificationId(saved.id, '');
          setFeedback('Reminder saved. Allow notifications in Settings to receive alerts.');
        }
      } else {
        await setReminderNotificationId(saved.id, '');
        setFeedback('Reminder saved. Notifications are off in Settings.');
      }
    }
    setVisible(false); setForm(blank()); setEditing(null); setError(''); await refresh();
  };
  const toggleCompleted = async (item: Reminder) => {
    if (!item.completed && item.notification_id) await cancelReminderNotification(item.notification_id);
    const nextCompleted = !item.completed;
    await setReminderCompleted(item.id, nextCompleted);
    if (!nextCompleted && (await getAppSetting('reminder_notifications_enabled', '1')) === '1') {
      const permission = (await requestReminderPermission()).granted;
      const updated = (await getReminders()).find((reminder) => reminder.id === item.id);
      if (permission && updated) await scheduleReminderNotification(updated);
    }
    await refresh();
  };
  const remove = async (item: Reminder) => { await cancelReminderNotification(item.notification_id); await removeReminder(item.id); await refresh(); };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.heading}>Reminders</Text><Text style={styles.subtitle}>Local alerts for important tasks.</Text></View><Pressable accessibilityLabel="Add reminder" onPress={openNew} style={styles.addButton}><Ionicons name="add" size={22} color={colors.surface} /></Pressable></View>
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search reminders" />
      <FilterRow options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'overdue', label: 'Overdue' }, { value: 'completed', label: 'Completed' }, { value: 'all', label: 'All' }]} value={filter} onChange={setFilter} />
      {feedback ? <Pressable onPress={() => setFeedback('')} style={styles.notice}><Ionicons name="checkmark-circle-outline" size={17} color={colors.green} /><Text style={styles.noticeText}>{feedback}</Text><Ionicons name="close" size={16} color={colors.muted} /></Pressable> : null}
      <View style={styles.summary}><View style={styles.summaryIcon}><Ionicons name="notifications-outline" size={20} color={colors.green} /></View><View><Text style={styles.summaryNumber}>{items.filter((item) => !item.completed && dateTime(item).getTime() >= Date.now()).length}</Text><Text style={styles.meta}>active reminders</Text></View></View>
      <Text style={styles.section}>{filter === 'upcoming' ? 'Upcoming reminders' : filter === 'overdue' ? 'Overdue reminders' : filter === 'completed' ? 'Completed' : 'All reminders'}</Text>
      {filtered.length ? filtered.map((item) => {
        const overdue = !item.completed && dateTime(item).getTime() < Date.now();
        return <View key={item.id} style={styles.card}>
          <Pressable accessibilityLabel={item.completed ? 'Mark as upcoming' : 'Mark as completed'} onPress={() => toggleCompleted(item)} style={[styles.check, Boolean(item.completed) && styles.checked]}><Ionicons name={item.completed ? 'checkmark' : 'ellipse-outline'} size={19} color={item.completed ? colors.surface : colors.green} /></Pressable>
          <Pressable onPress={() => openEdit(item)} style={styles.cardBody}><Text style={[styles.cardTitle, item.completed ? styles.strike : null]}>{item.title}</Text><Text style={[styles.date, overdue && styles.overdue]}>{dateLabel(item)}</Text><Text style={styles.meta}>{item.category}{item.notification_id ? ' · Alert scheduled' : ' · No alert'}</Text>{item.details ? <RichTextPreview value={item.details} style={styles.details} numberOfLines={2}/> : null}</Pressable>
          <View style={styles.actions}><Pressable accessibilityLabel="Edit reminder" onPress={() => openEdit(item)} style={styles.iconButton}><Ionicons name="create-outline" size={18} color={colors.muted} /></Pressable><Pressable accessibilityLabel="Delete reminder" onPress={() => remove(item)} style={styles.iconButton}><Ionicons name="trash-outline" size={17} color={colors.muted} /></Pressable></View>
        </View>;
      }) : <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="notifications-outline" size={23} color={colors.green} /></View><Text style={styles.emptyTitle}>{query ? 'No matches' : 'No reminders yet'}</Text><Text style={styles.meta}>{query ? 'Try another search or filter.' : 'Tap + to create your first reminder.'}</Text></View>}
      <Text style={styles.privacy}><Ionicons name="lock-closed-outline" size={12} color={colors.muted} />  Saved only on your device</Text>
    </ScrollView>

    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>{editing ? 'Edit reminder' : 'New reminder'}</Text><Text style={styles.sheetSubtitle}>This will be saved in the app and available offline.</Text></View><Pressable onPress={() => setVisible(false)}><Ionicons name="close" size={23} color={colors.ink} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Uri</Text><View style={styles.pills}>{categories.map((category) => <Pressable key={category} onPress={() => setForm({ ...form, category })} style={[styles.pill, form.category === category && styles.pillActive]}><Text style={[styles.pillText, form.category === category && styles.pillTextActive]}>{category}</Text></Pressable>)}</View>
      <Text style={styles.label}>Title</Text><TextInput placeholder="Hal. Balikan si Maria" placeholderTextColor={colors.muted} value={form.title} onChangeText={(title) => setForm({ ...form, title })} style={styles.input} />
      <View style={styles.split}><DateField label="Date" value={form.reminder_date} onChange={(reminder_date) => setForm({ ...form, reminder_date })} /><TimeField label="Time" value={form.reminder_time} onChange={(reminder_time) => setForm({ ...form, reminder_time })} /></View>
      <RichTextEditor value={form.details} onChange={(details) => setForm({ ...form, details })} placeholder="Place, topic, or additional details" minHeight={100}/>
      {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>Save reminder</Text></Pressable>
    </ScrollView></View></View></KeyboardAvoidingView></Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:30},header:{minHeight:65,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},addButton:{width:42,height:42,borderRadius:15,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'},summary:{marginTop:15,padding:14,flexDirection:'row',alignItems:'center',gap:11,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},summaryIcon:{width:39,height:39,borderRadius:13,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},summaryNumber:{fontSize:18,fontWeight:'700',color:colors.ink},meta:{fontSize:10,color:colors.muted,marginTop:3},section:{fontSize:15,fontWeight:'700',color:colors.ink,marginTop:23,marginBottom:10},notice:{flexDirection:'row',alignItems:'center',gap:7,padding:11,marginTop:10,borderRadius:13,backgroundColor:colors.greenSoft},noticeText:{flex:1,fontSize:11,color:colors.greenDark,lineHeight:16},card:{flexDirection:'row',alignItems:'center',gap:10,padding:12,marginBottom:8,borderRadius:16,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},check:{width:34,height:34,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},checked:{backgroundColor:colors.green},cardBody:{flex:1},cardTitle:{fontSize:14,fontWeight:'700',color:colors.ink},strike:{textDecorationLine:'line-through',color:colors.muted},date:{fontSize:11,fontWeight:'700',color:colors.green,marginTop:5},overdue:{color:colors.danger},details:{fontSize:11,color:colors.muted,marginTop:6,lineHeight:16},actions:{gap:4},iconButton:{padding:5},empty:{marginTop:3,padding:26,alignItems:'center',gap:7,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},emptyIcon:{width:42,height:42,borderRadius:15,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},emptyTitle:{fontSize:14,fontWeight:'700',color:colors.ink},privacy:{fontSize:11,color:colors.muted,alignSelf:'center',marginTop:19},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,25,22,.35)'},sheet:{maxHeight:'92%',paddingHorizontal:22,paddingTop:10,paddingBottom:28,borderTopLeftRadius:26,borderTopRightRadius:26,backgroundColor:colors.surface},handle:{width:36,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginBottom:18},sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:7},sheetTitle:{fontSize:20,fontWeight:'700',color:colors.ink},sheetSubtitle:{fontSize:11,color:colors.muted,marginTop:4},label:{fontSize:12,fontWeight:'600',color:colors.ink,marginTop:12,marginBottom:6},pills:{flexDirection:'row',flexWrap:'wrap',gap:7},pill:{paddingVertical:8,paddingHorizontal:10,borderRadius:12,backgroundColor:colors.canvas},pillActive:{backgroundColor:colors.greenSoft},pillText:{fontSize:11,color:colors.muted,fontWeight:'600'},pillTextActive:{color:colors.greenDark},input:{minHeight:43,paddingHorizontal:11,borderRadius:13,borderWidth:1,borderColor:colors.line,color:colors.ink,fontSize:13,backgroundColor:colors.surface},split:{flexDirection:'row',gap:9},multiline:{height:70,textAlignVertical:'top',paddingTop:11},error:{color:colors.danger,fontSize:12,marginTop:8},save:{height:48,marginTop:17,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.green},saveText:{color:colors.surface,fontWeight:'700',fontSize:14}});
