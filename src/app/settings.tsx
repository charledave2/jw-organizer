import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { getAppSetting, setAppSetting } from '../data/database';
import { refreshScheduledReminders } from '../data/notifications';
import { colors, spacing } from '../ui/theme';

export default function SettingsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [permission, setPermission] = useState<Notifications.PermissionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    const value = await getAppSetting('reminder_notifications_enabled', '1');
    setEnabled(value === '1');
    setPermission(await Notifications.getPermissionsAsync());
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const changeNotifications = async (next: boolean) => {
    setBusy(true); setMessage('');
    try {
      if (next) {
        const response = await refreshScheduledReminders(true, true);
        setPermission(response);
        if (!response.granted) {
          setEnabled(false);
          await setAppSetting('reminder_notifications_enabled', '0');
          setMessage(response.canAskAgain ? 'Hindi pa na-enable ang notification permission. Maaari mo itong subukan ulit.' : 'Naka-block ang permission. Buksan ang system settings para payagan ang notifications.');
        } else {
          setEnabled(true);
          await setAppSetting('reminder_notifications_enabled', '1');
          setMessage('Naka-enable ang notifications at naibalik ang mga naka-schedule na alert.');
        }
      } else {
        await setAppSetting('reminder_notifications_enabled', '0');
        await refreshScheduledReminders(false);
        setEnabled(false);
        setPermission(await Notifications.getPermissionsAsync());
        setMessage('Naka-off ang lahat ng naka-schedule na alert. Nananatili ang mga paalala sa device.');
      }
    } catch {
      setMessage('Hindi nabago ang notification setting. Subukan ulit.');
      await refresh();
    } finally { setBusy(false); }
  };
  const openSystemSettings = async () => { try { await Linking.openSettings(); } catch { setMessage('Hindi mabuksan ang system settings sa device na ito.'); } };

  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.heading}>Settings</Text><Text style={styles.subtitle}>Ayusin ang app sa gusto mong paraan.</Text></View></View>
    <Text style={styles.section}>Notifications</Text>
    <View style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="notifications-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Reminder alerts</Text><Text style={styles.meta}>{enabled ? 'Pinapayagan ang app na mag-alert' : 'Naka-off ang mga alert'}</Text></View><Switch value={enabled} onValueChange={changeNotifications} disabled={busy} trackColor={{ false: colors.line, true: colors.greenSoft }} thumbColor={enabled ? colors.green : '#F7F8F6'} /></View>
      <View style={styles.divider} />
      <View style={styles.statusRow}><View style={[styles.statusDot, permission?.granted ? styles.statusOn : styles.statusOff]} /><Text style={styles.statusText}>{permission?.granted ? 'Pinayagan sa Android' : permission?.canAskAgain === false ? 'Naka-block sa Android' : 'Hindi pa na-enable sa Android'}</Text></View>
      {permission?.granted ? null : <Pressable onPress={openSystemSettings} style={styles.secondaryButton}><Ionicons name="settings-outline" size={16} color={colors.green} /><Text style={styles.secondaryText}>Buksan ang permission settings</Text></Pressable>}
    </View>
    {message ? <View style={styles.message}><Ionicons name="information-circle-outline" size={17} color={colors.green} /><Text style={styles.messageText}>{message}</Text></View> : null}

    <Text style={styles.section}>Privacy at storage</Text>
    <View style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="phone-portrait-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Device-only data</Text><Text style={styles.meta}>Plans, notes, records, at reminders ay nasa local database ng phone mo.</Text></View></View>
      <View style={styles.divider} />
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="cloud-offline-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Offline by default</Text><Text style={styles.meta}>Walang account o cloud sync na kailangan. Android ang naghahatid ng local notification.</Text></View></View>
    </View>

    <Text style={styles.section}>App</Text>
    <View style={styles.card}><View style={styles.row}><View style={styles.iconBox}><Ionicons name="leaf-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>JW Organizer</Text><Text style={styles.meta}>Bersyon 1.0.0 · Forest green</Text></View><Ionicons name="checkmark-circle" size={19} color={colors.green} /></View></View>
    <Text style={styles.privacy}>JW Organizer · Ginawa para sa personal na paggamit</Text>
  </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:32},header:{minHeight:65,justifyContent:'center'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},section:{fontSize:14,fontWeight:'700',color:colors.ink,marginTop:23,marginBottom:10},card:{padding:14,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},row:{flexDirection:'row',alignItems:'center',gap:11},iconBox:{width:39,height:39,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},rowBody:{flex:1},title:{fontSize:13,fontWeight:'700',color:colors.ink},meta:{fontSize:11,color:colors.muted,marginTop:4,lineHeight:16},divider:{height:1,backgroundColor:colors.line,marginVertical:13},statusRow:{flexDirection:'row',alignItems:'center',gap:8},statusDot:{width:8,height:8,borderRadius:4},statusOn:{backgroundColor:colors.green},statusOff:{backgroundColor:colors.orange},statusText:{fontSize:11,color:colors.muted},secondaryButton:{minHeight:39,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginTop:12,borderRadius:13,backgroundColor:colors.greenSoft},secondaryText:{fontSize:11,fontWeight:'700',color:colors.greenDark},message:{flexDirection:'row',alignItems:'flex-start',gap:7,padding:11,marginTop:9,borderRadius:13,backgroundColor:colors.greenSoft},messageText:{flex:1,fontSize:11,color:colors.greenDark,lineHeight:16},privacy:{fontSize:10,color:colors.muted,alignSelf:'center',marginTop:21}});
