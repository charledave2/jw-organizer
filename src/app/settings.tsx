import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { createLocalBackup, getAppSetting, restoreLocalBackup, setAppSetting } from '../data/database';
import { refreshScheduledReminders } from '../data/notifications';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [permission, setPermission] = useState<Notifications.PermissionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Publisher');
  const [profileMessage, setProfileMessage] = useState('');
  const [photo, setPhoto] = useState('');
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const refresh = useCallback(async () => {
    const value = await getAppSetting('reminder_notifications_enabled', '1');
    setEnabled(value === '1');
    setPermission(await Notifications.getPermissionsAsync());
    setName(await getAppSetting('profile_name', ''));
    setRole(await getAppSetting('profile_role', 'Publisher'));
    setPhoto(await getAppSetting('profile_photo', ''));
    setBiometricEnabled((await getAppSetting('biometric_enabled', '0')) === '1');
    setBiometricAvailable(await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync());
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
  const saveProfile = async () => { await setAppSetting('profile_name', name.trim()); await setAppSetting('profile_role', role.trim() || 'Publisher'); await setAppSetting('profile_photo', photo); setProfileMessage('Na-save ang profile sa device.'); setProfileEditorOpen(false); };
  const choosePhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { setProfileMessage('Payagan muna ang photo access para makapili ng larawan.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const destination = `${FileSystem.documentDirectory}profile-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: result.assets[0].uri, to: destination });
    setPhoto(destination);
    setProfileMessage('Na-update ang profile photo. I-save ang profile para kumpirmahin.');
  };
  const exportBackup = async () => {
    try {
      const backup = await createLocalBackup() as Awaited<ReturnType<typeof createLocalBackup>> & { profilePhotoBase64?: string };
      const profilePhoto = await getAppSetting('profile_photo', '');
      if (profilePhoto && profilePhoto.startsWith(FileSystem.documentDirectory ?? '\u0000')) {
        backup.profilePhotoBase64 = await FileSystem.readAsStringAsync(profilePhoto, { encoding: FileSystem.EncodingType.Base64 });
      }
      const uri = `${FileSystem.cacheDirectory}jw-organizer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'I-save ang JW Organizer backup' });
      setBackupMessage('Na-export ang backup file. Piliin ang Drive o local storage sa share options.');
    } catch { setBackupMessage('Hindi na-export ang backup. Subukan ulit.'); }
  };
  const importBackup = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json'], copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets[0]) return;
      const contents = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(contents) as Awaited<ReturnType<typeof createLocalBackup>> & { profilePhotoBase64?: string };
      if (parsed.profilePhotoBase64) {
        const photoUri = `${FileSystem.documentDirectory}profile-restored-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(photoUri, parsed.profilePhotoBase64, { encoding: FileSystem.EncodingType.Base64 });
        const settings = parsed.tables.app_settings as { setting_key: string; setting_value: string }[];
        const photoSetting = settings.find((item) => item.setting_key === 'profile_photo');
        if (photoSetting) photoSetting.setting_value = photoUri;
      }
      Alert.alert('I-restore ang backup?', 'Papalitan nito ang kasalukuyang local data sa app.', [
        { text: 'Kanselahin', style: 'cancel' },
        { text: 'I-restore', style: 'destructive', onPress: () => { void (async () => { try { await restoreLocalBackup(parsed); setBackupMessage('Na-restore ang data. Isara at buksan muli ang app para i-refresh ang mga screen.'); } catch (error) { setBackupMessage(error instanceof Error ? error.message : 'Hindi na-restore ang backup.'); } })(); } },
      ]);
    } catch { setBackupMessage('Hindi mabasa ang backup file. Pumili ng valid na JW Organizer JSON backup.'); }
  };
  const changeBiometric = async (next: boolean) => {
    setMessage('');
    if (!next) { await setAppSetting('biometric_enabled', '0'); setBiometricEnabled(false); setMessage('Naka-off ang app lock.'); return; }
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(supported && enrolled);
    if (!supported || !enrolled) { setMessage('Mag-set up muna ng fingerprint o face unlock sa Android Settings.'); return; }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'I-enable ang biometric lock', promptDescription: 'Kumpirmahin ang fingerprint o face unlock mo.', cancelLabel: 'Kanselahin', biometricsSecurityLevel: 'weak' });
    if (!result.success) { setMessage('Hindi na-enable ang biometric lock.'); return; }
    await setAppSetting('biometric_enabled', '1'); setBiometricEnabled(true); setMessage('Naka-enable ang biometric lock. Hihingi ito ng authentication sa susunod na pagbukas ng app.');
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><View><Text style={styles.heading}>Settings</Text><Text style={styles.subtitle}>Ayusin ang app sa gusto mong paraan.</Text></View></View>
    <Text style={styles.section}>Profile</Text>
    <View style={styles.card}>
      <View style={styles.profileRow}>
        <View style={styles.profilePhoto}>{photo ? <Image source={{ uri: photo }} style={styles.profileImage} /> : <Ionicons name="person" size={25} color={colors.green} />}</View>
        <View style={styles.rowBody}><Text style={styles.title}>{name.trim() || 'Pangalan ng user'}</Text><Text style={styles.meta}>{role.trim() || 'Role'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="I-edit ang profile" onPress={() => setProfileEditorOpen(true)} style={styles.iconAction}><Ionicons name="create-outline" size={19} color={colors.green} /></Pressable>
      </View>
      {profileMessage ? <Text style={styles.profileMessage}>{profileMessage}</Text> : null}
    </View>

    <Text style={styles.section}>Appearance</Text>
    <View style={styles.card}><View style={styles.row}><View style={styles.iconBox}><Ionicons name={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Theme</Text><Text style={styles.meta}>Pumili ng tema ng buong app.</Text></View></View><View style={styles.themePicker}><Pressable onPress={() => setMode('light')} style={[styles.themeOption, mode === 'light' && styles.themeOptionActive]}><Ionicons name="sunny-outline" size={15} color={mode === 'light' ? colors.greenDark : colors.muted}/><Text style={[styles.themeText, mode === 'light' && styles.themeTextActive]}>Light</Text></Pressable><Pressable onPress={() => setMode('dark')} style={[styles.themeOption, mode === 'dark' && styles.themeOptionActive]}><Ionicons name="moon-outline" size={15} color={mode === 'dark' ? colors.greenDark : colors.muted}/><Text style={[styles.themeText, mode === 'dark' && styles.themeTextActive]}>Dark</Text></Pressable></View></View>

    <Text style={styles.section}>Security</Text>
    <View style={styles.card}><View style={styles.row}><View style={styles.iconBox}><Ionicons name="finger-print-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Biometric authentication</Text><Text style={styles.meta}>{biometricAvailable ? 'Fingerprint o face unlock kapag binubuksan ang app.' : 'Mag-enroll muna ng fingerprint o face unlock sa device.'}</Text></View><Switch value={biometricEnabled} onValueChange={changeBiometric} trackColor={{ false: colors.line, true: colors.greenSoft }} thumbColor={biometricEnabled ? colors.green : colors.muted}/></View></View>

    <Text style={styles.section}>Notifications</Text>
    <View style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="notifications-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Push notifications</Text><Text style={styles.meta}>{enabled ? 'Naka-on ang local reminder notifications' : 'Naka-off ang reminder notifications'}</Text></View><Switch value={enabled} onValueChange={changeNotifications} disabled={busy} trackColor={{ false: colors.line, true: colors.greenSoft }} thumbColor={enabled ? colors.green : colors.surface} /></View>
      <View style={styles.divider} />
      <View style={styles.statusRow}><View style={[styles.statusDot, permission?.granted ? styles.statusOn : styles.statusOff]} /><Text style={styles.statusText}>{permission?.granted ? 'Pinayagan sa Android' : permission?.canAskAgain === false ? 'Naka-block sa Android' : 'Hindi pa na-enable sa Android'}</Text></View>
      <Pressable onPress={() => router.push('/reminders')} style={styles.secondaryButton}><Ionicons name="list-outline" size={16} color={colors.green} /><Text style={styles.secondaryText}>Buksan ang reminders</Text></Pressable>
      {permission?.granted ? null : <Pressable onPress={openSystemSettings} style={styles.secondaryButton}><Ionicons name="settings-outline" size={16} color={colors.green} /><Text style={styles.secondaryText}>Buksan ang permission settings</Text></Pressable>}
    </View>
    {message ? <View style={styles.message}><Ionicons name="information-circle-outline" size={17} color={colors.green} /><Text style={styles.messageText}>{message}</Text></View> : null}

    <Text style={styles.section}>Privacy at storage</Text>
    <View style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="phone-portrait-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Device-only data</Text><Text style={styles.meta}>Plans, notes, records, at reminders ay nasa local database ng phone mo.</Text></View></View>
      <View style={styles.divider} />
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="cloud-offline-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Offline by default</Text><Text style={styles.meta}>Walang account o cloud sync na kailangan. Android ang naghahatid ng local notification.</Text></View></View>
    </View>

    <Text style={styles.section}>Backup at restore</Text>
    <Pressable accessibilityRole="button" onPress={() => { setBackupMessage(''); setBackupOpen(true); }} style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="cloud-download-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Backup at restore</Text><Text style={styles.meta}>Gumawa ng local backup o pumili ng dati mong backup file.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>
    </Pressable>

    <Text style={styles.section}>App</Text>
    <View style={styles.card}><View style={styles.row}><View style={styles.iconBox}><Ionicons name="leaf-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>JW Organizer</Text><Text style={styles.meta}>Bersyon 1.0.0 · Forest green</Text></View><Ionicons name="checkmark-circle" size={19} color={colors.green} /></View></View>
    <Text style={styles.privacy}>JW Organizer · Ginawa para sa personal na paggamit</Text>
  </ScrollView>
  <Modal visible={profileEditorOpen} animationType="slide" transparent onRequestClose={() => setProfileEditorOpen(false)}>
    <View style={styles.modalBackdrop}><View style={styles.modalCard}>
      <View style={styles.modalHeader}><Text style={styles.modalTitle}>I-edit ang profile</Text><Pressable accessibilityLabel="Isara" onPress={() => setProfileEditorOpen(false)}><Ionicons name="close" size={22} color={colors.ink} /></Pressable></View>
      <Pressable onPress={choosePhoto} style={styles.photoPicker}>{photo ? <Image source={{ uri: photo }} style={styles.photoPreview} /> : <View style={styles.photoPlaceholder}><Ionicons name="person" size={30} color={colors.green} /></View>}<View style={styles.photoHint}><Ionicons name="camera-outline" size={16} color={colors.green} /><Text style={styles.secondaryText}>Pumili ng photo</Text></View></Pressable>
      <Text style={styles.fieldLabel}>Pangalan</Text><TextInput value={name} onChangeText={(value) => { setName(value); setProfileMessage(''); }} placeholder="Ilagay ang pangalan" placeholderTextColor={colors.muted} style={styles.input} />
      <Text style={styles.fieldLabel}>Role</Text><TextInput value={role} onChangeText={(value) => { setRole(value); setProfileMessage(''); }} placeholder="Hal. Publisher" placeholderTextColor={colors.muted} style={styles.input} />
      <Pressable onPress={saveProfile} style={styles.saveButton}><Text style={styles.saveButtonText}>I-save ang profile</Text></Pressable>
    </View></View>
  </Modal>
  <Modal visible={backupOpen} animationType="slide" transparent onRequestClose={() => setBackupOpen(false)}>
    <View style={styles.modalBackdrop}><View style={styles.modalCard}>
      <View style={styles.modalHeader}><Text style={styles.modalTitle}>Backup at restore</Text><Pressable accessibilityLabel="Isara" onPress={() => setBackupOpen(false)}><Ionicons name="close" size={22} color={colors.ink} /></Pressable></View>
      <Text style={styles.meta}>I-save ang data bilang JSON sa Google Drive o sa phone. Para magbalik ng data, pumili ng JW Organizer backup file.</Text>
      <Pressable onPress={exportBackup} style={styles.backupAction}><View style={styles.iconBox}><Ionicons name="share-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Gumawa ng backup</Text><Text style={styles.meta}>Buksan ang share menu para piliin ang Drive o local storage.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>
      <Pressable onPress={importBackup} style={styles.backupAction}><View style={styles.iconBox}><Ionicons name="refresh-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>I-restore ang backup</Text><Text style={styles.meta}>Pumili ng dating JSON backup; hihingi muna ng kumpirmasyon.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>
      <View style={styles.googleBackup}><Ionicons name="logo-google" size={17} color={colors.green} /><View style={styles.rowBody}><Text style={styles.title}>Google device backup</Text><Text style={styles.meta}>Kasama ang app data sa Android backup kapag naka-enable ang Google One/device backup sa phone settings.</Text></View></View>
      {backupMessage ? <Text style={styles.profileMessage}>{backupMessage}</Text> : null}
    </View></View>
  </Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:32},header:{minHeight:65,justifyContent:'center'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},section:{fontSize:14,fontWeight:'700',color:colors.ink,marginTop:23,marginBottom:10},card:{padding:14,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},row:{flexDirection:'row',alignItems:'center',gap:11},profileRow:{flexDirection:'row',alignItems:'center',gap:12},profilePhoto:{width:58,height:58,borderRadius:29,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center',overflow:'hidden'},profileImage:{width:'100%',height:'100%'},iconAction:{width:38,height:38,borderRadius:12,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},iconBox:{width:39,height:39,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},rowBody:{flex:1},title:{fontSize:13,fontWeight:'700',color:colors.ink},meta:{fontSize:11,color:colors.muted,marginTop:4,lineHeight:16},divider:{height:1,backgroundColor:colors.line,marginVertical:13},fieldLabel:{fontSize:11,fontWeight:'700',color:colors.ink,marginTop:9,marginBottom:5},input:{minHeight:42,paddingHorizontal:11,borderRadius:12,borderWidth:1,borderColor:colors.line,color:colors.ink,fontSize:13,backgroundColor:colors.surface},saveButton:{height:40,marginTop:13,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.green},saveButtonText:{fontSize:12,fontWeight:'700',color:colors.surface},profileMessage:{fontSize:10,color:colors.green,marginTop:8},themePicker:{flexDirection:'row',gap:8,marginTop:13},themeOption:{flex:1,minHeight:39,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderRadius:12,backgroundColor:colors.canvas},themeOptionActive:{backgroundColor:colors.greenSoft},themeText:{fontSize:11,color:colors.muted,fontWeight:'600'},themeTextActive:{color:colors.greenDark},statusRow:{flexDirection:'row',alignItems:'center',gap:8},statusDot:{width:8,height:8,borderRadius:4},statusOn:{backgroundColor:colors.green},statusOff:{backgroundColor:colors.orange},statusText:{fontSize:11,color:colors.muted},secondaryButton:{minHeight:39,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginTop:12,borderRadius:13,backgroundColor:colors.greenSoft},secondaryText:{fontSize:11,fontWeight:'700',color:colors.greenDark},message:{flexDirection:'row',alignItems:'flex-start',gap:7,padding:11,marginTop:9,borderRadius:13,backgroundColor:colors.greenSoft},messageText:{flex:1,fontSize:11,color:colors.greenDark,lineHeight:16},privacy:{fontSize:10,color:colors.muted,alignSelf:'center',marginTop:21},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.42)',justifyContent:'flex-end'},modalCard:{padding:20,paddingBottom:30,borderTopLeftRadius:24,borderTopRightRadius:24,backgroundColor:colors.surface},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},modalTitle:{fontSize:18,fontWeight:'700',color:colors.ink},photoPicker:{alignItems:'center',marginBottom:6},photoPreview:{width:84,height:84,borderRadius:42},photoPlaceholder:{width:84,height:84,borderRadius:42,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},photoHint:{flexDirection:'row',alignItems:'center',gap:6,marginTop:8},backupAction:{flexDirection:'row',alignItems:'center',gap:11,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line},googleBackup:{flexDirection:'row',alignItems:'flex-start',gap:11,padding:12,marginTop:14,borderRadius:14,backgroundColor:colors.greenSoft}});
