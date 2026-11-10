import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';

const tools: { title: string; subtitle: string; route: '/reminders' | '/calendar' | '/reports' | '/settings'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Reminders', subtitle: 'Mga alert para sa schedule at follow-up', route: '/reminders', icon: 'notifications-outline' },
  { title: 'Calendar', subtitle: 'Tingnan ang buwan at mga araw ng pulong', route: '/calendar', icon: 'calendar-outline' },
  { title: 'Reports', subtitle: 'Buod ng oras at mga nagawa sa ministeryo', route: '/reports', icon: 'bar-chart-outline' },
  { title: 'Settings', subtitle: 'Notifications, privacy, at app info', route: '/settings', icon: 'settings-outline' },
];

export default function MoreScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.heading}>More</Text><Text style={styles.subtitle}>Iba pang tool para sa organizer mo.</Text></View>
    <View style={styles.grid}>{tools.map((tool) => <Pressable key={tool.route} onPress={() => router.push(tool.route)} style={styles.card}>
      <View style={styles.iconBox}><Ionicons name={tool.icon} size={20} color={colors.green} /></View><View style={styles.cardBody}><Text style={styles.title}>{tool.title}</Text><Text style={styles.description}>{tool.subtitle}</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>)}</View>
    <View style={styles.footer}><Ionicons name="leaf-outline" size={15} color={colors.green} /><Text style={styles.footerText}>JW Organizer · Naka-save sa device mo</Text></View>
  </ScrollView></SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:30},header:{minHeight:65,justifyContent:'center'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},grid:{gap:9,marginTop:17},card:{minHeight:77,flexDirection:'row',alignItems:'center',gap:12,padding:13,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},iconBox:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},cardBody:{flex:1},title:{fontSize:14,fontWeight:'700',color:colors.ink},description:{fontSize:11,color:colors.muted,marginTop:4},footer:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:23},footerText:{fontSize:10,color:colors.muted}});
