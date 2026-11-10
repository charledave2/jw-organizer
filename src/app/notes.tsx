import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllOrganizerNotes, getOrganizerNotes, NoteCategory, OrganizerNote, removeOrganizerNote, saveOrganizerNote } from '../data/database';
import { colors, spacing } from '../ui/theme';
import { SearchInput } from '../ui/SearchFilters';

const categories: { key: NoteCategory; label: string; icon: keyof typeof Ionicons.glyphMap; intro: string }[] = [
  { key: 'Midweek', label: 'Midweek', icon: 'calendar-outline', intro: 'Mga tala sa pulong sa gitnang sanlinggo.' },
  { key: 'Weekend', label: 'Weekend', icon: 'people-outline', intro: 'Mga tala sa pulong tuwing weekend.' },
  { key: 'Journal', label: 'Journal', icon: 'book-outline', intro: 'Mga karanasan at repleksiyon sa ministeryo.' },
  { key: 'Prompter', label: 'Prompter', icon: 'reader-outline', intro: 'Mga script para sa pahayag at presentasyon.' },
];
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`; };
const dateLabel = (key: string) => { if (!key) return 'Walang petsa'; const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('fil-PH', { month: 'long', day: 'numeric', year: 'numeric' }); };
const emptyForm = (category: NoteCategory) => ({ category, title: '', content: '', note_date: todayKey() });

export default function NotesScreen() {
  const [category, setCategory] = useState<NoteCategory | 'All'>('Midweek');
  const [notes, setNotes] = useState<OrganizerNote[]>([]);
  const [query, setQuery] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<OrganizerNote | null>(null);
  const [form, setForm] = useState(emptyForm('Midweek'));
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState<OrganizerNote | null>(null);
  const [playing, setPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(23);
  const [speed, setSpeed] = useState(1);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const scrollY = useRef(0);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);
  const selected = categories.find((item) => item.key === category) ?? { key: 'All' as const, label: 'All', icon: 'albums-outline' as const, intro: 'Lahat ng meeting notes, journal, at prompter script.' };
  const refresh = useCallback(async () => setNotes(category === 'All' ? await getAllOrganizerNotes() : await getOrganizerNotes(category)), [category]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!playing || !prompt) return;
    const interval = setInterval(() => {
      const max = Math.max(0, contentHeight.current - viewportHeight.current);
      const next = Math.min(max, scrollY.current + speed);
      scrollY.current = next;
      scrollRef.current?.scrollTo({ y: next, animated: false });
      if (next >= max) setPlaying(false);
    }, 45);
    return () => clearInterval(interval);
  }, [playing, prompt, speed]);

  const openNew = () => { const formCategory = category === 'All' ? 'Midweek' : category; setEditing(null); setForm(emptyForm(formCategory)); setError(''); setFormVisible(true); };
  const openEdit = (item: OrganizerNote) => { setEditing(item); setForm({ category: item.category, title: item.title, content: item.content, note_date: item.note_date || todayKey() }); setError(''); setFormVisible(true); };
  const save = async () => {
    if (!form.title.trim()) { setError('Maglagay ng pamagat.'); return; }
    if (form.note_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.note_date)) { setError('Gamitin ang petsang YYYY-MM-DD.'); return; }
    await saveOrganizerNote({ ...form, title: form.title.trim() }, editing?.id);
    setFormVisible(false); await refresh();
  };
  const openPrompt = (item: OrganizerNote) => { setPrompt(item); setPlaying(false); setFontSize(23); scrollY.current = 0; };
  const filteredNotes = notes.filter((item) => !query.trim() || `${item.title} ${item.content} ${item.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.heading}>Notes</Text><Text style={styles.subtitle}>Meeting notes, journal, at prompter.</Text></View><Pressable accessibilityLabel="Gumawa ng tala" onPress={openNew} style={styles.addButton}><Ionicons name="add" size={22} color={colors.surface} /></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{([{key:'All',label:'All',icon:'albums-outline' as const},...categories] as {key:NoteCategory|'All';label:string;icon:keyof typeof Ionicons.glyphMap}[]).map((item) => <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.categoryPill, category === item.key && styles.categoryPillActive]}><Ionicons name={item.icon} size={15} color={category === item.key ? colors.greenDark : colors.muted} /><Text style={[styles.categoryText, category === item.key && styles.categoryTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
      <View style={styles.intro}><View style={styles.introIcon}><Ionicons name={selected.icon} size={20} color={colors.green}/></View><View style={{flex:1}}><Text style={styles.introTitle}>{category === 'All' ? 'All notes' : category === 'Journal' ? 'My Journal' : category === 'Prompter' ? 'Prompter' : `${category} meeting`}</Text><Text style={styles.introText}>{selected.intro}</Text></View></View>
      <SearchInput value={query} onChangeText={setQuery} placeholder="Maghanap sa notes" />
      {filteredNotes.length ? filteredNotes.map((item) => <View key={item.id} style={styles.noteCard}>
        <Pressable onPress={() => item.category === 'Prompter' ? openPrompt(item) : openEdit(item)} style={styles.noteMain}><Text style={styles.noteTitle}>{item.title}</Text>{category === 'All' ? <Text style={styles.categoryTag}>{item.category}</Text> : null}<Text style={styles.noteDate}>{dateLabel(item.note_date)}</Text>{item.content ? <Text numberOfLines={item.category === 'Prompter' ? 3 : 4} style={styles.noteExcerpt}>{item.content}</Text> : <Text style={styles.noteExcerpt}>Walang laman pa ang tala.</Text>}{item.category === 'Prompter' ? <Text style={styles.openPrompt}><Ionicons name="play-circle-outline" size={15} color={colors.green}/>  Buksan ang prompter</Text> : null}</Pressable>
        <View style={styles.cardActions}><Pressable accessibilityLabel="I-edit" onPress={() => openEdit(item)} style={styles.actionButton}><Ionicons name="create-outline" size={18} color={colors.muted}/></Pressable><Pressable accessibilityLabel="Burahin" onPress={async () => { await removeOrganizerNote(item.id, item.category); await refresh(); }} style={styles.actionButton}><Ionicons name="trash-outline" size={17} color={colors.muted}/></Pressable></View>
      </View>) : <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={selected.icon} size={23} color={colors.green}/></View><Text style={styles.emptyTitle}>{query ? 'Walang tugma' : category === 'All' ? 'Wala pang notes' : `Wala pang ${selected.label.toLowerCase()} notes`}</Text><Text style={styles.emptyText}>{query ? 'Subukan ang ibang salita o piliin ang ibang kategorya.' : 'I-tap ang + para gumawa ng unang tala.'}</Text></View>}
      <Text style={styles.privacy}><Ionicons name="lock-closed-outline" size={12} color={colors.muted}/>  Naka-save lang sa device mo</Text>
    </ScrollView>

    <Modal visible={formVisible} animationType="slide" transparent onRequestClose={() => setFormVisible(false)}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle}/><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>{editing ? 'I-edit ang tala' : category === 'Journal' ? 'Bagong journal entry' : category === 'Prompter' ? 'Bagong prompter script' : `Bagong ${category.toLowerCase()} notes`}</Text><Text style={styles.sheetSubtitle}>{category === 'Prompter' ? 'I-save ang script para gamitin sa prompter.' : selected.intro}</Text></View><Pressable onPress={() => setFormVisible(false)}><Ionicons name="close" size={23} color={colors.ink}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Pamagat</Text><TextInput placeholder={category === 'Prompter' ? 'Pamagat ng script' : 'Hal. Pag-aaral ng Bantayan'} placeholderTextColor={colors.muted} value={form.title} onChangeText={(title) => setForm({...form,title})} style={styles.input}/>
      <Text style={styles.label}>Petsa (YYYY-MM-DD)</Text><TextInput placeholder={todayKey()} value={form.note_date} onChangeText={(note_date) => setForm({...form,note_date})} style={styles.input}/>
      <Text style={styles.label}>{category === 'Prompter' ? 'Script' : category === 'Journal' ? 'Karanasan o repleksiyon' : 'Mga tala'}</Text><TextInput placeholder={category === 'Prompter' ? 'Ilagay dito ang buong script…' : 'Isulat dito…'} placeholderTextColor={colors.muted} value={form.content} onChangeText={(content) => setForm({...form,content})} style={[styles.input,styles.contentInput]} multiline textAlignVertical="top"/>
      {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={save} style={styles.saveButton}><Text style={styles.saveButtonText}>I-save ang tala</Text></Pressable>
    </ScrollView></View></View></Modal>

    <Modal visible={Boolean(prompt)} animationType="fade" onRequestClose={() => {setPlaying(false);setPrompt(null);}}><SafeAreaView style={styles.promptSafe}>
      <View style={styles.promptHeader}><Pressable onPress={() => {setPlaying(false);setPrompt(null);}} style={styles.promptClose}><Ionicons name="close" size={22} color={colors.ink}/></Pressable><View style={{flex:1}}><Text numberOfLines={1} style={styles.promptTitle}>{prompt?.title}</Text><Text style={styles.promptSubtitle}>Prompter</Text></View><Pressable onPress={() => prompt && openEdit(prompt)} style={styles.promptClose}><Ionicons name="create-outline" size={20} color={colors.ink}/></Pressable></View>
      <View style={styles.promptControls}><View style={styles.controlGroup}><Pressable accessibilityLabel="Bawasan ang font size" onPress={() => setFontSize((n)=>Math.max(17,n-2))} style={styles.controlButton}><Ionicons name="remove" size={18} color={colors.ink}/></Pressable><Text style={styles.controlValue}>{fontSize}</Text><Pressable accessibilityLabel="Dagdagan ang font size" onPress={() => setFontSize((n)=>Math.min(38,n+2))} style={styles.controlButton}><Ionicons name="add" size={18} color={colors.ink}/></Pressable></View><View style={styles.controlGroup}><Pressable accessibilityLabel="Bagalan ang scroll" onPress={() => setSpeed((n)=>Math.max(1,n-1))} style={styles.controlButton}><Ionicons name="remove" size={18} color={colors.ink}/></Pressable><Text style={styles.controlValue}>{speed === 1 ? 'Mabagal' : speed === 2 ? 'Katamtaman' : 'Mabilis'}</Text><Pressable accessibilityLabel="Bilisan ang scroll" onPress={() => setSpeed((n)=>Math.min(3,n+1))} style={styles.controlButton}><Ionicons name="add" size={18} color={colors.ink}/></Pressable></View></View>
      <ScrollView ref={scrollRef} style={styles.promptScroll} contentContainerStyle={styles.promptBody} onLayout={(e)=>{viewportHeight.current=e.nativeEvent.layout.height;}} onContentSizeChange={(_,h)=>{contentHeight.current=h;}} onScroll={(e)=>{scrollY.current=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={100}><Text style={[styles.scriptText,{fontSize,lineHeight:fontSize*1.55}]}>{prompt?.content}</Text></ScrollView>
      <View style={styles.promptFooter}><Pressable onPress={() => {scrollY.current=0;scrollRef.current?.scrollTo({y:0,animated:true});setPlaying(false);}} style={styles.resetButton}><Ionicons name="refresh-outline" size={19} color={colors.green}/><Text style={styles.resetText}>Simula</Text></Pressable><Pressable onPress={() => setPlaying((v)=>!v)} style={styles.playButton}><Ionicons name={playing?'pause':'play'} size={19} color={colors.surface}/><Text style={styles.playText}>{playing?'I-pause':'Auto-scroll'}</Text></Pressable></View>
    </SafeAreaView></Modal>
  </SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:30},header:{minHeight:65,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},addButton:{width:42,height:42,borderRadius:15,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'},categoryRow:{gap:8,paddingVertical:15},categoryPill:{paddingHorizontal:13,paddingVertical:9,borderRadius:14,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',gap:6},categoryPillActive:{backgroundColor:colors.greenSoft,borderColor:colors.greenSoft},categoryText:{fontSize:12,color:colors.muted,fontWeight:'600'},categoryTextActive:{color:colors.greenDark},intro:{flexDirection:'row',alignItems:'center',gap:11,padding:14,marginBottom:14,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},introIcon:{width:38,height:38,borderRadius:13,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},introTitle:{fontSize:14,fontWeight:'700',color:colors.ink},introText:{fontSize:11,color:colors.muted,marginTop:3},noteCard:{flexDirection:'row',gap:8,padding:14,marginBottom:9,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},noteMain:{flex:1},noteTitle:{fontSize:14,fontWeight:'700',color:colors.ink},categoryTag:{fontSize:10,fontWeight:'700',color:colors.green,marginTop:4},noteDate:{fontSize:10,color:colors.green,marginTop:5,fontWeight:'600'},noteExcerpt:{fontSize:12,color:colors.muted,lineHeight:18,marginTop:8},openPrompt:{fontSize:11,fontWeight:'700',color:colors.green,marginTop:10},cardActions:{gap:5},actionButton:{padding:5},empty:{marginTop:5,padding:28,alignItems:'center',gap:8,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},emptyIcon:{width:44,height:44,borderRadius:16,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},emptyTitle:{fontSize:14,fontWeight:'700',color:colors.ink},emptyText:{fontSize:11,color:colors.muted},privacy:{fontSize:11,color:colors.muted,alignSelf:'center',marginTop:20},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,25,22,.35)'},sheet:{maxHeight:'90%',paddingHorizontal:22,paddingTop:10,paddingBottom:28,borderTopLeftRadius:26,borderTopRightRadius:26,backgroundColor:colors.surface},handle:{width:36,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginBottom:18},sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:14,marginBottom:8},sheetTitle:{fontSize:19,fontWeight:'700',color:colors.ink},sheetSubtitle:{fontSize:11,color:colors.muted,marginTop:4},label:{fontSize:12,fontWeight:'600',color:colors.ink,marginTop:12,marginBottom:6},input:{minHeight:44,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:colors.line,color:colors.ink,fontSize:13,backgroundColor:colors.surface},contentInput:{height:210,padding:12},error:{fontSize:12,color:colors.danger,marginTop:8},saveButton:{height:48,marginTop:18,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.green},saveButtonText:{fontSize:14,fontWeight:'700',color:colors.surface},promptSafe:{flex:1,backgroundColor:colors.canvas},promptHeader:{flexDirection:'row',alignItems:'center',gap:11,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.line,backgroundColor:colors.surface},promptClose:{width:36,height:36,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.canvas},promptTitle:{fontSize:14,fontWeight:'700',color:colors.ink},promptSubtitle:{fontSize:10,color:colors.muted,marginTop:2},promptControls:{minHeight:53,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:17,borderBottomWidth:1,borderBottomColor:colors.line,backgroundColor:colors.surface},controlGroup:{flexDirection:'row',alignItems:'center',gap:9},controlButton:{width:30,height:30,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:colors.canvas},controlValue:{fontSize:11,fontWeight:'600',color:colors.ink},promptScroll:{flex:1},promptBody:{paddingHorizontal:25,paddingVertical:28},scriptText:{color:colors.ink,fontWeight:'500'},promptFooter:{flexDirection:'row',gap:10,padding:14,paddingBottom:18,borderTopWidth:1,borderTopColor:colors.line,backgroundColor:colors.surface},resetButton:{flex:1,height:46,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderRadius:14,backgroundColor:colors.greenSoft},resetText:{fontSize:13,fontWeight:'700',color:colors.greenDark},playButton:{flex:1,height:46,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderRadius:14,backgroundColor:colors.green},playText:{fontSize:13,fontWeight:'700',color:colors.surface}});
