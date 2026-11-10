import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPlanItems, PlanItem, removePlanItem, savePlanItem, togglePlanItem } from '../data/database';
import { colors, spacing } from '../ui/theme';
import { FilterRow, SearchInput } from '../ui/SearchFilters';

const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`; };
const dateLabel = (key: string) => { if (!key) return ''; const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('fil-PH', { weekday: 'short', month: 'short', day: 'numeric' }); };
const blank = () => ({ title: '', plan_date: todayKey(), plan_time: '', category: 'Ministry' as 'Ministry' | 'Personal study', notes: '' });

export default function PlanScreen() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'ministry' | 'study'>('all');
  const refresh = useCallback(async () => setItems(await getPlanItems()), []);
  useEffect(() => { refresh(); }, [refresh]);
  const save = async () => {
    if (!form.title.trim()) { setError('Maglagay ng pangalan ng plano.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.plan_date)) { setError('Gamitin ang petsang YYYY-MM-DD.'); return; }
    setItems(await savePlanItem({ ...form, title: form.title.trim() })); setForm(blank()); setError(''); setVisible(false);
  };
  const searched = items.filter((item) => !query.trim() || `${item.title} ${item.notes} ${item.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const filtered = searched.filter((item) => filter === 'all' || (filter === 'upcoming' ? !item.completed : filter === 'completed' ? Boolean(item.completed) : filter === 'ministry' ? item.category === 'Ministry' : item.category === 'Personal study'));
  const upcoming = filtered.filter((item) => !item.completed);
  const completed = filtered.filter((item) => item.completed);
  const renderItem = (item: PlanItem) => <View key={item.id} style={styles.card}>
    <Pressable onPress={async () => setItems(await togglePlanItem(item))} style={[styles.check, item.completed ? styles.checked : undefined]}><Ionicons name={item.completed ? 'checkmark' : 'ellipse-outline'} size={20} color={item.completed ? colors.surface : colors.green} /></Pressable>
    <View style={styles.cardBody}><Text style={[styles.cardTitle, item.completed ? styles.strike : undefined]}>{item.title}</Text><Text style={styles.meta}>{dateLabel(item.plan_date)}{item.plan_time ? ` · ${item.plan_time}` : ''} · {item.category}</Text>{item.notes ? <Text style={styles.note} numberOfLines={2}>{item.notes}</Text> : null}</View>
    <Pressable accessibilityLabel="Burahin ang plano" onPress={async () => setItems(await removePlanItem(item.id))} style={styles.iconButton}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
  </View>;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.heading}>Plan</Text><Text style={styles.subtitle}>Ayusin ang susunod mong ministry at personal study.</Text></View><Pressable accessibilityLabel="Magdagdag ng plano" onPress={() => { setForm(blank()); setError(''); setVisible(true); }} style={styles.addButton}><Ionicons name="add" size={22} color={colors.surface} /></Pressable></View>
    <View style={styles.summary}><View style={styles.summaryIcon}><Ionicons name="calendar-outline" size={20} color={colors.green} /></View><View><Text style={styles.summaryNumber}>{upcoming.length}</Text><Text style={styles.meta}>nakabinbing plano</Text></View></View>
    <SearchInput value={query} onChangeText={setQuery} placeholder="Maghanap ng plano" />
    <FilterRow options={[{value:'all',label:'Lahat'},{value:'upcoming',label:'Paparating'},{value:'completed',label:'Natapos'},{value:'ministry',label:'Ministry'},{value:'study',label:'Personal study'}]} value={filter} onChange={setFilter} />
    {filter === 'all' || filter === 'upcoming' || filter === 'ministry' || filter === 'study' ? <>
    <Text style={styles.section}>Mga paparating</Text>
    {upcoming.length ? upcoming.map(renderItem) : <View style={styles.empty}><Ionicons name="sparkles-outline" size={25} color={colors.green} /><Text style={styles.emptyTitle}>{query ? 'Walang tugma' : 'Wala pang plano'}</Text><Text style={styles.meta}>{query ? 'Subukan ang ibang salita o filter.' : 'Magdagdag ng ministry session o personal study.'}</Text></View>}
    </> : null}
    {(filter === 'all' || filter === 'completed') && completed.length > 0 && <><Text style={[styles.section, { marginTop: 25 }]}>Natapos</Text>{completed.map(renderItem)}</>}
    <Text style={styles.privacy}><Ionicons name="lock-closed-outline" size={12} color={colors.muted} />  Naka-save lang sa device mo</Text>
  </ScrollView>
  <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle}/><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Bagong plano</Text><Pressable onPress={() => setVisible(false)}><Ionicons name="close" size={23} color={colors.ink}/></Pressable></View>
    <Text style={styles.label}>Uri</Text><View style={styles.pills}>{(['Ministry','Personal study'] as const).map((category) => <Pressable key={category} onPress={() => setForm({ ...form, category })} style={[styles.pill, form.category === category && styles.pillActive]}><Text style={[styles.pillText, form.category === category && styles.pillTextActive]}>{category}</Text></Pressable>)}</View>
    <Text style={styles.label}>Pangalan</Text><TextInput placeholder="Hal. Ministry sa Sabado" placeholderTextColor={colors.muted} value={form.title} onChangeText={(title) => setForm({ ...form, title })} style={styles.input}/>
    <View style={styles.split}><View style={{flex:1}}><Text style={styles.label}>Petsa (YYYY-MM-DD)</Text><TextInput placeholder={todayKey()} value={form.plan_date} onChangeText={(plan_date) => setForm({ ...form, plan_date })} style={styles.input} autoCapitalize="none"/></View><View style={{flex:1}}><Text style={styles.label}>Oras (opsyonal)</Text><TextInput placeholder="09:00" value={form.plan_time} onChangeText={(plan_time) => setForm({ ...form, plan_time })} style={styles.input}/></View></View>
    <Text style={styles.label}>Mga tala (opsyonal)</Text><TextInput placeholder="Lugar o paalala" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} style={[styles.input, styles.multiline]} multiline/>
    {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>I-save ang plano</Text></Pressable>
  </View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:30},header:{minHeight:65,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},addButton:{width:42,height:42,borderRadius:15,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'},summary:{marginTop:16,padding:15,flexDirection:'row',alignItems:'center',gap:12,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},summaryIcon:{width:40,height:40,borderRadius:14,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},summaryNumber:{fontSize:18,fontWeight:'700',color:colors.ink},meta:{fontSize:11,color:colors.muted,marginTop:3},section:{fontSize:15,fontWeight:'700',color:colors.ink,marginTop:25,marginBottom:11},card:{flexDirection:'row',alignItems:'center',gap:11,padding:13,marginBottom:8,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},check:{width:34,height:34,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},checked:{backgroundColor:colors.green},cardBody:{flex:1},cardTitle:{fontSize:14,fontWeight:'600',color:colors.ink},strike:{textDecorationLine:'line-through',color:colors.muted},note:{fontSize:11,color:colors.muted,marginTop:5},iconButton:{padding:7},empty:{marginTop:2,padding:26,alignItems:'center',gap:7,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},emptyTitle:{fontSize:14,fontWeight:'700',color:colors.ink},privacy:{fontSize:11,color:colors.muted,alignSelf:'center',marginTop:20},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,25,22,.35)'},sheet:{paddingHorizontal:22,paddingTop:10,paddingBottom:28,borderTopLeftRadius:26,borderTopRightRadius:26,backgroundColor:colors.surface},handle:{width:36,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginBottom:18},sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:13},sheetTitle:{fontSize:20,fontWeight:'700',color:colors.ink},label:{fontSize:12,fontWeight:'600',color:colors.ink,marginTop:11,marginBottom:7},pills:{flexDirection:'row',gap:8},pill:{paddingVertical:9,paddingHorizontal:14,borderRadius:14,backgroundColor:colors.canvas},pillActive:{backgroundColor:colors.greenSoft},pillText:{fontSize:12,color:colors.muted,fontWeight:'600'},pillTextActive:{color:colors.greenDark},input:{minHeight:44,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:colors.line,color:colors.ink,fontSize:13,backgroundColor:colors.surface},split:{flexDirection:'row',gap:10},multiline:{height:70,textAlignVertical:'top',paddingTop:11},error:{color:colors.danger,fontSize:12,marginTop:8},save:{height:48,marginTop:18,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.green},saveText:{color:colors.surface,fontWeight:'700',fontSize:14}});
