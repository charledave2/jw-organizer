import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMinistryRecords, MinistryRecord, removeMinistryRecord, saveMinistryRecord } from '../data/database';
import { colors, spacing } from '../ui/theme';
import { FilterRow, SearchInput } from '../ui/SearchFilters';

type RecordType = MinistryRecord['record_type'];
const blank = (type: RecordType) => ({ record_type:type, name:'', location:'', contact:'', material:'', progress:'', notes:'', next_date:'' });
const dateLabel = (key: string) => { if (!key) return 'Walang naka-schedule na follow-up'; const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('fil-PH',{month:'short',day:'numeric',year:'numeric'}); };
const localTodayKey = () => { const date=new Date(); return `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,'0')}-${`${date.getDate()}`.padStart(2,'0')}`; };

export default function RecordsScreen() {
  const [type,setType]=useState<RecordType>('Bible study');
  const [items,setItems]=useState<MinistryRecord[]>([]);
  const [visible,setVisible]=useState(false);
  const [editing,setEditing]=useState<MinistryRecord|null>(null);
  const [form,setForm]=useState(blank('Bible study'));
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'all'|'followup'|'overdue'|'unscheduled'>('all');
  const refresh=useCallback(async()=>setItems(await getMinistryRecords(type)),[type]);
  useEffect(()=>{refresh();},[refresh]);
  const add=()=>{setEditing(null);setForm(blank(type));setError('');setVisible(true);};
  const edit=(item:MinistryRecord)=>{setEditing(item);setForm({record_type:item.record_type,name:item.name,location:item.location,contact:item.contact,material:item.material,progress:item.progress,notes:item.notes,next_date:item.next_date});setError('');setVisible(true);};
  const save=async()=>{if(!form.name.trim()){setError('Ilagay ang pangalan.');return;}if(form.next_date&&!/^\d{4}-\d{2}-\d{2}$/.test(form.next_date)){setError('Gamitin ang petsang YYYY-MM-DD.');return;}await saveMinistryRecord({...form,name:form.name.trim()},editing?.id);setItems(await getMinistryRecords(type));setVisible(false);};
  const field=(label:string,key:keyof typeof form,placeholder:string,multiline=false)=><View><Text style={styles.label}>{label}</Text><TextInput placeholder={placeholder} placeholderTextColor={colors.muted} value={form[key]} onChangeText={(v)=>setForm({...form,[key]:v})} style={[styles.input,multiline&&styles.multiline]} multiline={multiline}/></View>;
  const visibleItems=items.filter((item)=>{
    const q=query.trim().toLocaleLowerCase();
    const matchesQuery=!q||[item.name,item.location,item.contact,item.material,item.progress,item.notes].some((value)=>value.toLocaleLowerCase().includes(q));
    const overdue=Boolean(item.next_date)&&new Date(`${item.next_date}T00:00:00`).getTime()<new Date(`${localTodayKey()}T00:00:00`).getTime();
    const matchesFilter=filter==='all'||(filter==='followup'&&Boolean(item.next_date)&&!overdue)||(filter==='overdue'&&overdue)||(filter==='unscheduled'&&!item.next_date);
    return matchesQuery&&matchesFilter;
  });
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.heading}>Records</Text><Text style={styles.subtitle}>Mga Bible study at return visit mo.</Text></View><Pressable accessibilityLabel="Magdagdag ng record" onPress={add} style={styles.addButton}><Ionicons name="add" size={22} color={colors.surface}/></Pressable></View>
    <View style={styles.tabs}>{(['Bible study','Return visit'] as const).map((value)=><Pressable key={value} onPress={()=>setType(value)} style={[styles.tab,type===value&&styles.tabActive]}><Text style={[styles.tabText,type===value&&styles.tabTextActive]}>{value==='Bible study'?'Bible studies':'Return visits'}</Text></Pressable>)}</View>
    <SearchInput value={query} onChangeText={setQuery} placeholder="Maghanap ng tao o paksa"/><FilterRow options={[{value:'all',label:'Lahat'},{value:'followup',label:'May follow-up'},{value:'overdue',label:'Na-late'},{value:'unscheduled',label:'Walang petsa'}]} value={filter} onChange={setFilter}/>
    {visibleItems.length?visibleItems.map((item)=><Pressable key={item.id} onPress={()=>edit(item)} style={styles.card}><View style={styles.personIcon}><Ionicons name={type==='Bible study'?'book-outline':'chatbubble-ellipses-outline'} size={19} color={colors.green}/></View><View style={styles.cardBody}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.location||'Walang lokasyong inilagay'}</Text><Text style={styles.follow}>{dateLabel(item.next_date)}</Text>{item.record_type==='Bible study'&&item.material?<Text style={styles.extra}>{item.material}{item.progress?` · ${item.progress}`:''}</Text>:null}{item.notes?<Text style={styles.note} numberOfLines={2}>{item.notes}</Text>:null}</View><Pressable accessibilityLabel={`Burahin si ${item.name}`} onPress={async(e:any)=>{e.stopPropagation?.();await removeMinistryRecord(item.id);refresh();}} style={styles.delete}><Ionicons name="trash-outline" size={17} color={colors.muted}/></Pressable></Pressable>):<View style={styles.empty}><Ionicons name={type==='Bible study'?'book-outline':'chatbubble-ellipses-outline'} size={26} color={colors.green}/><Text style={styles.emptyTitle}>{query||filter!=='all'?'Walang tugma':`Wala pang ${type==='Bible study'?'Bible study':'return visit'}`}</Text><Text style={styles.meta}>{query||filter!=='all'?'Subukan ang ibang salita o filter.':'I-tap ang + para magdagdag ng record.'}</Text></View>}
    <Text style={styles.privacy}><Ionicons name="lock-closed-outline" size={12} color={colors.muted}/>  Naka-save lang sa device mo</Text>
  </ScrollView>
  <Modal visible={visible} animationType="slide" transparent onRequestClose={()=>setVisible(false)}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle}/><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{editing?'I-edit ang record':`Bagong ${type==='Bible study'?'Bible study':'return visit'}`}</Text><Pressable onPress={()=>setVisible(false)}><Ionicons name="close" size={23} color={colors.ink}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">
    {field('Pangalan','name','Pangalan ng tao')}{field('Lokasyon','location','Address o lugar')}{field('Contact details','contact','Numero o ibang contact')}
    {type==='Bible study'?<>{field('Study material','material','Publication o materyal')}{field('Progress','progress','Lesson o chapter')}</>:<>{field('Huling napag-usapan','material','Paksa o scripture')}{field('Susunod na hakbang','progress','Ano ang babalikan?')}</>}
    {field('Susunod na follow-up (YYYY-MM-DD)','next_date','2026-11-15')}{field('Mga tala','notes','Mga detalye ng usapan o paalala',true)}
    {error?<Text style={styles.error}>{error}</Text>:null}<Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>I-save ang record</Text></Pressable>
  </ScrollView></View></View></Modal>
  </SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:30},header:{minHeight:65,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},addButton:{width:42,height:42,borderRadius:15,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'},tabs:{flexDirection:'row',backgroundColor:'#ECEFEB',borderRadius:15,padding:4,marginTop:16,marginBottom:14},tab:{flex:1,alignItems:'center',paddingVertical:10,borderRadius:12},tabActive:{backgroundColor:colors.surface},tabText:{fontSize:12,color:colors.muted,fontWeight:'600'},tabTextActive:{color:colors.ink},card:{flexDirection:'row',alignItems:'flex-start',gap:11,padding:14,marginBottom:9,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},personIcon:{width:38,height:38,borderRadius:14,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},cardBody:{flex:1},name:{fontSize:14,fontWeight:'700',color:colors.ink},meta:{fontSize:11,color:colors.muted,marginTop:4},follow:{fontSize:11,fontWeight:'600',color:colors.green,marginTop:7},extra:{fontSize:11,color:colors.ink,marginTop:7},note:{fontSize:11,color:colors.muted,marginTop:5,lineHeight:16},delete:{padding:5},empty:{padding:28,marginTop:5,alignItems:'center',gap:7,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},emptyTitle:{fontSize:14,fontWeight:'700',color:colors.ink},privacy:{fontSize:11,color:colors.muted,alignSelf:'center',marginTop:20},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,25,22,.35)'},sheet:{maxHeight:'92%',paddingHorizontal:22,paddingTop:10,paddingBottom:26,borderTopLeftRadius:26,borderTopRightRadius:26,backgroundColor:colors.surface},handle:{width:36,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginBottom:18},sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},sheetTitle:{fontSize:19,fontWeight:'700',color:colors.ink},label:{fontSize:12,fontWeight:'600',color:colors.ink,marginTop:10,marginBottom:6},input:{minHeight:43,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:colors.line,color:colors.ink,fontSize:13,backgroundColor:colors.surface},multiline:{height:68,textAlignVertical:'top',paddingTop:10},error:{color:colors.danger,fontSize:12,marginTop:8},save:{height:48,marginTop:16,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.green},saveText:{color:colors.surface,fontWeight:'700',fontSize:14}});
