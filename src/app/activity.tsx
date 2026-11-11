import { AppText as Text } from '../ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTracker } from '../state/TrackerContext';
import { formatDayLabel, formatDuration } from '../ui/format';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';

export default function ActivityScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { sessions } = useTracker();

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.ink}/></Pressable>
        <View style={styles.titleGroup}><Text style={styles.heading}>Recent activity</Text><Text style={styles.subtitle}>All your logged field service sessions.</Text></View>
      </View>
      {sessions.length ? sessions.map((session) => <View key={session.id} style={styles.card}>
        <View style={styles.icon}><Ionicons name="leaf-outline" size={19} color={colors.green}/></View>
        <View style={styles.body}>
          <Text style={styles.date}>{formatDayLabel(session.service_date)}</Text>
          <Text style={styles.meta}>{session.placements} placements · {session.videos} videos</Text>
          <Text style={styles.meta}>{session.return_visits} return visits · {session.bible_studies} Bible studies</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(session.duration_seconds)}</Text>
      </View>) : <View style={styles.empty}><View style={styles.icon}><Ionicons name="time-outline" size={20} color={colors.green}/></View><Text style={styles.emptyTitle}>No activity yet</Text><Text style={styles.meta}>Your saved field service sessions will appear here.</Text></View>}
      <Text style={styles.privacy}><Ionicons name="lock-closed-outline" size={12} color={colors.muted}/>  Saved on your device</Text>
    </ScrollView>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:30},header:{minHeight:72,flexDirection:'row',alignItems:'center',gap:12},back:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},titleGroup:{flex:1},heading:{fontSize:23,fontWeight:'700',color:colors.ink,letterSpacing:-.5},subtitle:{fontSize:11,color:colors.muted,marginTop:3},card:{flexDirection:'row',alignItems:'center',gap:11,padding:14,marginBottom:9,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},icon:{width:39,height:39,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},body:{flex:1},date:{fontSize:13,fontWeight:'700',color:colors.ink},meta:{fontSize:10,color:colors.muted,marginTop:4},duration:{fontSize:12,fontWeight:'700',color:colors.ink},empty:{padding:24,alignItems:'center',gap:8,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},emptyTitle:{fontSize:14,fontWeight:'700',color:colors.ink},privacy:{fontSize:11,color:colors.muted,alignSelf:'center',marginTop:18},
});
