import { AppText as Text, AppTextInput as TextInput } from '../ui/AppText';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMinistryRecords, MinistryRecord, removeMinistryRecord, saveMinistryRecord } from '../data/database';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';
import { FilterRow, SearchInput } from '../ui/SearchFilters';
import { DateField } from '../ui/DateTimeFields';
import { plainText, RichTextEditor, RichTextPreview } from '../ui/RichTextEditor';

type RecordType = MinistryRecord['record_type'];
type CurrentLocation = { latitude: number; longitude: number; address: string };
const locationPrefix = 'GPS1:';
const blank = (type: RecordType) => ({ record_type:type, name:'', location:'', contact:'', material:'', progress:'', notes:'', next_date:'' });
const encodeLocation = (location: CurrentLocation) => locationPrefix + JSON.stringify(location);
const decodeLocation = (value: string): CurrentLocation | null => {
  if (!value.startsWith(locationPrefix)) return null;
  try {
    const parsed = JSON.parse(value.slice(locationPrefix.length));
    if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude) && typeof parsed.address === 'string') return parsed;
  } catch { /* Older or malformed location values remain available in the form. */ }
  return null;
};
const locationLabel = (value: string) => decodeLocation(value)?.address || (value ? 'Saved location' : 'No location added');
const locationCoordinates = (value: string) => { const point=decodeLocation(value); return point ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}` : value; };
const dateLabel = (key: string) => { if (!key) return 'No follow-up scheduled'; const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
const localTodayKey = () => { const date=new Date(); return `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,'0')}-${`${date.getDate()}`.padStart(2,'0')}`; };

export default function RecordsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [type,setType]=useState<RecordType>('Bible study');
  const [items,setItems]=useState<MinistryRecord[]>([]);
  const [visible,setVisible]=useState(false);
  const [editing,setEditing]=useState<MinistryRecord|null>(null);
  const [form,setForm]=useState(blank('Bible study'));
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'all'|'followup'|'overdue'|'unscheduled'>('all');
  const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(null);
  const [locationLoading,setLocationLoading]=useState(false);
  const [locationMessage,setLocationMessage]=useState('');
  const refresh=useCallback(async()=>setItems(await getMinistryRecords(type)),[type]);
  useEffect(()=>{refresh();},[refresh]);
  const add=()=>{setEditing(null);setForm(blank(type));setCurrentLocation(null);setLocationMessage('');setError('');setVisible(true);};
  const edit=(item:MinistryRecord)=>{setEditing(item);setForm({record_type:item.record_type,name:item.name,location:item.location,contact:item.contact,material:item.material,progress:item.progress,notes:item.notes,next_date:item.next_date});setCurrentLocation(decodeLocation(item.location));setLocationMessage('');setError('');setVisible(true);};
  const captureLocation=async()=>{
    setLocationLoading(true);setError('');setLocationMessage('');
    try {
      const permission=await Location.requestForegroundPermissionsAsync();
      if(permission.status!=='granted'){setError('Allow location access to add the current address.');return;}
      const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      const {latitude,longitude}=position.coords;
      let address='';
      try {
        const [place]=await Location.reverseGeocodeAsync({latitude,longitude});
        if(place) address=[place.name,place.streetNumber&&place.street?`${place.streetNumber} ${place.street}`:place.street,place.district,place.city,place.region,place.postalCode,place.country].filter(Boolean).filter((part,index,list)=>list.indexOf(part)===index).join(', ');
      } catch { /* Keep coordinates even when an address cannot be resolved. */ }
      const next={latitude,longitude,address:address||'Address lookup unavailable'};
      setCurrentLocation(next);setForm((previous)=>({...previous,location:encodeLocation(next)}));
      if(!address)setLocationMessage('GPS coordinates were saved, but an address could not be resolved.');
    } catch { setError('Could not get your current location. Check that device location is enabled and try again.'); }
    finally { setLocationLoading(false); }
  };
  const save=async()=>{if(!form.name.trim()){setError('Enter a name.');return;}if(form.next_date&&!/^\d{4}-\d{2}-\d{2}$/.test(form.next_date)){setError('Choose a valid date.');return;}await saveMinistryRecord({...form,name:form.name.trim(),location:currentLocation?encodeLocation(currentLocation):form.location},editing?.id);setItems(await getMinistryRecords(type));setVisible(false);};
  const field=(label:string,key:keyof typeof form,placeholder:string,multiline=false)=><View><Text style={styles.label}>{label}</Text><TextInput placeholder={placeholder} placeholderTextColor={colors.muted} value={form[key]} onChangeText={(v)=>setForm({...form,[key]:v})} style={[styles.input,multiline&&styles.multiline]} multiline={multiline}/></View>;
  const visibleItems=items.filter((item)=>{
    const q=query.trim().toLocaleLowerCase();
    const matchesQuery=!q||[item.name,item.location,item.contact,item.material,item.progress,plainText(item.notes)].some((value)=>value.toLocaleLowerCase().includes(q));
    const overdue=Boolean(item.next_date)&&new Date(`${item.next_date}T00:00:00`).getTime()<new Date(`${localTodayKey()}T00:00:00`).getTime();
    const matchesFilter=filter==='all'||(filter==='followup'&&Boolean(item.next_date)&&!overdue)||(filter==='overdue'&&overdue)||(filter==='unscheduled'&&!item.next_date);
    return matchesQuery&&matchesFilter;
  });
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><View><Text style={styles.heading}>Records</Text><Text style={styles.subtitle}>Your Bible studies and return visits.</Text></View><View style={{flexDirection:'row',gap:8}}><Pressable accessibilityLabel="Open location map" onPress={()=>router.push('/map')} style={[styles.addButton,{backgroundColor:colors.greenSoft}]}><Ionicons name="map-outline" size={20} color={colors.green}/></Pressable><Pressable accessibilityLabel="Add record" onPress={add} style={styles.addButton}><Ionicons name="add" size={22} color={colors.surface}/></Pressable></View></View>
    <View style={styles.tabs}>{(['Bible study','Return visit'] as const).map((value)=><Pressable key={value} onPress={()=>setType(value)} style={[styles.tab,type===value&&styles.tabActive]}><Text style={[styles.tabText,type===value&&styles.tabTextActive]}>{value==='Bible study'?'Bible studies':'Return visits'}</Text></Pressable>)}</View>
    <SearchInput value={query} onChangeText={setQuery} placeholder="Search people or topics"/><FilterRow options={[{value:'all',label:'All'},{value:'followup',label:'Follow-up scheduled'},{value:'overdue',label:'Overdue'},{value:'unscheduled',label:'No date'}]} value={filter} onChange={setFilter}/>
    {visibleItems.length?visibleItems.map((item)=><Pressable key={item.id} onPress={()=>edit(item)} style={styles.card}><View style={styles.personIcon}><Ionicons name={type==='Bible study'?'book-outline':'chatbubble-ellipses-outline'} size={19} color={colors.green}/></View><View style={styles.cardBody}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{locationLabel(item.location)}</Text>{item.location?<Text style={styles.coordinates}>{locationCoordinates(item.location)}</Text>:null}<Text style={styles.follow}>{dateLabel(item.next_date)}</Text>{item.record_type==='Bible study'&&item.material?<Text style={styles.extra}>{item.material}{item.progress?` · ${item.progress}`:''}</Text>:null}{item.notes?<RichTextPreview value={item.notes} style={styles.note} numberOfLines={2}/>:null}</View><Pressable accessibilityLabel={`Delete ${item.name}`} onPress={async(e:any)=>{e.stopPropagation?.();await removeMinistryRecord(item.id);refresh();}} style={styles.delete}><Ionicons name="trash-outline" size={17} color={colors.muted}/></Pressable></Pressable>):<View style={styles.empty}><Ionicons name={type==='Bible study'?'book-outline':'chatbubble-ellipses-outline'} size={26} color={colors.green}/><Text style={styles.emptyTitle}>{query||filter!=='all'?'No matches':`No ${type==='Bible study'?'Bible studies':'return visits'} yet`}</Text><Text style={styles.meta}>{query||filter!=='all'?'Try another search or filter.':'Tap + to add a record.'}</Text></View>}
    <Text style={styles.privacy}><Ionicons name="lock-closed-outline" size={12} color={colors.muted}/>  Saved only on your device</Text>
  </ScrollView></KeyboardAvoidingView>
  <Modal visible={visible} animationType="slide" transparent onRequestClose={()=>setVisible(false)}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle}/><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{editing?'Edit record':`New ${type==='Bible study'?'Bible study':'return visit'}`}</Text><Pressable onPress={()=>setVisible(false)}><Ionicons name="close" size={23} color={colors.ink}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">
    {field('Name','name','Person name')}<Text style={styles.label}>GPS location</Text><View style={styles.locationCard}><View style={styles.locationIcon}><Ionicons name="location" size={18} color={colors.green}/></View><View style={styles.locationBody}><Text style={styles.locationAddress}>{currentLocation?.address||locationLabel(form.location)}</Text><Text style={styles.meta}>{currentLocation?`${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`:form.location?locationCoordinates(form.location):'Address and coordinates are stored with this record.'}</Text></View></View><Pressable onPress={captureLocation} disabled={locationLoading} style={[styles.locationButton,locationLoading&&styles.locationButtonDisabled]}>{locationLoading?<ActivityIndicator size="small" color={colors.surface}/>:<Ionicons name="locate-outline" size={17} color={colors.surface}/>}<Text style={styles.locationButtonText}>{locationLoading?'Getting current location…':currentLocation?'Refresh GPS location':'Use current GPS location'}</Text></Pressable>{locationMessage?<Text style={styles.locationMessage}>{locationMessage}</Text>:null}{field('Contact details','contact','Phone or other contact')}
    {type==='Bible study'?<>{field('Study material','material','Publication or material')}{field('Progress','progress','Lesson or chapter')}</>:<>{field('Last discussion','material','Topic or scripture')}{field('Next step','progress','What should be followed up?')}</>}
    <DateField label="Next follow-up" value={form.next_date} onChange={(next_date) => setForm({ ...form, next_date })} /><Text style={styles.label}>Notes</Text><RichTextEditor value={form.notes} onChange={(notes)=>setForm({...form,notes})} placeholder="Conversation notes or reminders" minHeight={100}/>
    {error?<Text style={styles.error}>{error}</Text>:null}<Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>Save record</Text></Pressable>
  </ScrollView></View></View></KeyboardAvoidingView></Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:30},header:{minHeight:65,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},addButton:{width:42,height:42,borderRadius:15,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'},tabs:{flexDirection:'row',backgroundColor:colors.canvas,borderRadius:15,padding:4,marginTop:16,marginBottom:14},tab:{flex:1,alignItems:'center',paddingVertical:10,borderRadius:12},tabActive:{backgroundColor:colors.surface},tabText:{fontSize:12,color:colors.muted,fontWeight:'600'},tabTextActive:{color:colors.ink},card:{flexDirection:'row',alignItems:'flex-start',gap:11,padding:14,marginBottom:9,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},personIcon:{width:38,height:38,borderRadius:14,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},cardBody:{flex:1},name:{fontSize:14,fontWeight:'700',color:colors.ink},meta:{fontSize:11,color:colors.muted,marginTop:4},coordinates:{fontSize:10,color:colors.muted,marginTop:3},follow:{fontSize:11,fontWeight:'600',color:colors.green,marginTop:7},extra:{fontSize:11,color:colors.ink,marginTop:7},note:{fontSize:11,color:colors.muted,marginTop:5,lineHeight:16},delete:{padding:5},empty:{padding:28,marginTop:5,alignItems:'center',gap:7,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},emptyTitle:{fontSize:14,fontWeight:'700',color:colors.ink},privacy:{fontSize:11,color:colors.muted,alignSelf:'center',marginTop:20},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,25,22,.35)'},sheet:{maxHeight:'92%',paddingHorizontal:22,paddingTop:10,paddingBottom:26,borderTopLeftRadius:26,borderTopRightRadius:26,backgroundColor:colors.surface},handle:{width:36,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginBottom:18},sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},sheetTitle:{fontSize:19,fontWeight:'700',color:colors.ink},label:{fontSize:12,fontWeight:'600',color:colors.ink,marginTop:10,marginBottom:6},locationCard:{minHeight:67,flexDirection:'row',alignItems:'center',gap:10,padding:11,borderRadius:13,borderWidth:1,borderColor:colors.line,backgroundColor:colors.canvas},locationIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},locationBody:{flex:1},locationAddress:{fontSize:12,fontWeight:'700',color:colors.ink,lineHeight:17},locationButton:{minHeight:41,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginTop:8,borderRadius:12,backgroundColor:colors.green},locationButtonDisabled:{opacity:.65},locationButtonText:{fontSize:11,fontWeight:'700',color:colors.surface},locationMessage:{fontSize:10,color:colors.orange,marginTop:6,lineHeight:15},input:{minHeight:43,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:colors.line,color:colors.ink,fontSize:13,backgroundColor:colors.surface},multiline:{height:68,textAlignVertical:'top',paddingTop:10},error:{color:colors.danger,fontSize:12,marginTop:8},save:{height:48,marginTop:16,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.green},saveText:{color:colors.surface,fontWeight:'700',fontSize:14}});
