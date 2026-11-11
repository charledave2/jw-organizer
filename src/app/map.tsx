import { AppText as Text } from '../ui/AppText';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, UrlTile, Region } from 'react-native-maps';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getMinistryRecords, MinistryRecord } from '../data/database';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';

type Point = { latitude: number; longitude: number; address: string };
const prefix = 'GPS1:';
const pointFrom = (value: string): Point | null => {
  if (!value.startsWith(prefix)) return null;
  try {
    const point = JSON.parse(value.slice(prefix.length));
    return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) ? point : null;
  } catch { return null; }
};

export default function MapScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [records, setRecords] = useState<MinistryRecord[]>([]);
  const [selected, setSelected] = useState<MinistryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setRecords(await getMinistryRecords()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const locations = useMemo(() => records.flatMap((record) => {
    const point = pointFrom(record.location);
    return point ? [{ record, point }] : [];
  }), [records]);
  const initialRegion: Region = useMemo(() => {
    if (!locations.length) return { latitude: 14.5995, longitude: 120.9842, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    if (locations.length === 1) return { ...locations[0].point, latitudeDelta: 0.025, longitudeDelta: 0.025 };
    const lats = locations.map(({ point }) => point.latitude);
    const lngs = locations.map(({ point }) => point.longitude);
    const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), 0.02);
    const lngSpan = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.02);
    return { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2, latitudeDelta: latSpan * 1.6, longitudeDelta: lngSpan * 1.6 };
  }, [locations]);
  useEffect(() => {
    if (!locations.length) return;
    const frame = requestAnimationFrame(() => {
      if (locations.length === 1) mapRef.current?.animateToRegion(initialRegion, 350);
      else mapRef.current?.fitToCoordinates(locations.map(({ point }) => point), { edgePadding: { top: 55, right: 45, bottom: 55, left: 45 }, animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [locations, initialRegion]);

  const navigate = async (record: MinistryRecord) => {
    const point = pointFrom(record.location);
    if (!point) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
    try { await Linking.openURL(url); } catch { /* Keep the map usable if no navigation handler is installed. */ }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.ink}/></Pressable>
      <View style={styles.titleGroup}><Text style={styles.title}>Locations</Text><Text style={styles.subtitle}>{locations.length} saved GPS {locations.length === 1 ? 'pin' : 'pins'}</Text></View>
    </View>
    <View style={styles.mapFrame}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} mapType="none" onPress={() => setSelected(null)}>
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} tileCachePath={`${FileSystem.cacheDirectory}osm-map-tiles`} tileCacheMaxAge={604800} />
        {locations.map(({ record, point }) => <Marker key={record.id} coordinate={point} title={record.name} description={point.address} pinColor={record.record_type === 'Bible study' ? colors.green : '#C47B42'} onPress={() => setSelected(record)} />)}
      </MapView>
      <View style={styles.attribution}><Text style={styles.attributionText}>© OpenStreetMap contributors</Text></View>
    </View>
    {selected ? <View style={styles.selectedCard}>
      <View style={[styles.pinIcon,{backgroundColor:selected.record_type==='Bible study'?colors.greenSoft:'#F3E9DF'}]}><Ionicons name="location" size={18} color={selected.record_type==='Bible study'?colors.green:'#A86332'}/></View>
      <View style={styles.selectedBody}><Text style={styles.person}>{selected.name}</Text><Text style={styles.address}>{pointFrom(selected.location)?.address || 'GPS address unavailable'}</Text><Text style={styles.type}>{selected.record_type}</Text></View>
      <Pressable accessibilityLabel={`Navigate to ${selected.name}`} onPress={()=>void navigate(selected)} style={styles.navigate}><Ionicons name="navigate" size={17} color={colors.surface}/><Text style={styles.navigateText}>Go</Text></Pressable>
    </View> : null}
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.green}/></View> : !locations.length ? <View style={styles.empty}><Ionicons name="map-outline" size={30} color={colors.green}/><Text style={styles.emptyTitle}>No saved GPS locations</Text><Text style={styles.emptyBody}>Add a Bible study or return visit with its current GPS location to see pins here.</Text></View> : null}
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.canvas},header:{height:68,paddingHorizontal:spacing.lg,flexDirection:'row',alignItems:'center',gap:12},back:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},titleGroup:{flex:1},title:{fontSize:21,fontWeight:'700',color:colors.ink},subtitle:{fontSize:11,color:colors.muted,marginTop:2},mapFrame:{flex:1,overflow:'hidden',marginHorizontal:12,marginBottom:12,borderRadius:22,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},attribution:{position:'absolute',bottom:7,right:8,paddingHorizontal:6,paddingVertical:3,borderRadius:5,backgroundColor:'rgba(255,255,255,.88)'},attributionText:{fontSize:9,color:'#333'},selectedCard:{marginHorizontal:spacing.lg,marginBottom:10,padding:13,flexDirection:'row',alignItems:'center',gap:10,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},pinIcon:{width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center'},selectedBody:{flex:1},person:{fontSize:14,fontWeight:'700',color:colors.ink},address:{fontSize:10,color:colors.muted,marginTop:3},type:{fontSize:10,color:colors.green,marginTop:3,fontWeight:'600'},navigate:{height:38,paddingHorizontal:13,borderRadius:12,backgroundColor:colors.green,flexDirection:'row',alignItems:'center',gap:5},navigateText:{fontSize:11,fontWeight:'700',color:colors.surface},center:{position:'absolute',top:100,left:0,right:0,alignItems:'center'},empty:{position:'absolute',top:150,left:36,right:36,padding:24,alignItems:'center',gap:8,borderRadius:20,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},emptyTitle:{fontSize:15,fontWeight:'700',color:colors.ink},emptyBody:{fontSize:12,color:colors.muted,textAlign:'center',lineHeight:18},
});
