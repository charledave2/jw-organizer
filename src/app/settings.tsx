import { AppText as Text, AppTextInput as TextInput } from '../ui/AppText';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
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
import { useTracker } from '../state/TrackerContext';
import { ThemeColors, useAppTheme, spacing } from '../ui/theme';
import { AppUpdateCard } from '../ui/AppUpdateCard';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { refreshSessions } = useTracker();
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
          setMessage(response.canAskAgain ? 'Notification permission is not enabled yet. You can try again.' : 'Permission is blocked. Open system settings to allow notifications.');
        } else {
          setEnabled(true);
          await setAppSetting('reminder_notifications_enabled', '1');
          setMessage('Notifications are enabled and scheduled alerts have been restored.');
        }
      } else {
        await setAppSetting('reminder_notifications_enabled', '0');
        await refreshScheduledReminders(false);
        setEnabled(false);
        setPermission(await Notifications.getPermissionsAsync());
        setMessage('All scheduled alerts are off. Reminders remain saved on this device.');
      }
    } catch {
      setMessage('The notification setting could not be changed. Try again.');
      await refresh();
    } finally { setBusy(false); }
  };
  const openSystemSettings = async () => { try { await Linking.openSettings(); } catch { setMessage('System settings could not be opened on this device.'); } };
  const saveProfile = async () => { await setAppSetting('profile_name', name.trim()); await setAppSetting('profile_role', role.trim() || 'Publisher'); await setAppSetting('profile_photo', photo); setProfileMessage('Profile saved on this device.'); setProfileEditorOpen(false); };
  const choosePhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { setProfileMessage('Allow photo access to choose an image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const destination = `${FileSystem.documentDirectory}profile-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: result.assets[0].uri, to: destination });
    setPhoto(destination);
    setProfileMessage('Profile photo updated. Save the profile to confirm.');
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
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Save JW Organizer backup' });
      setBackupMessage('Backup exported. Choose Drive or local storage in the share options.');
    } catch { setBackupMessage('Backup could not be exported. Try again.'); }
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
      Alert.alert('Restore backup?', 'This will replace the current local app data.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => { void (async () => { try { await restoreLocalBackup(parsed); await refreshSessions(); const notificationsEnabled = (await getAppSetting('reminder_notifications_enabled', '1')) === '1'; await refreshScheduledReminders(notificationsEnabled); await refresh(); setBackupMessage('Backup restored. Data and reminders have been refreshed.'); } catch (error) { setBackupMessage(error instanceof Error ? error.message : 'Backup could not be restored.'); } })(); } },
      ]);
    } catch { setBackupMessage('Backup could not be read. Choose a valid JW Organizer JSON backup.'); }
  };
  const changeBiometric = async (next: boolean) => {
    setMessage('');
    if (!next) { await setAppSetting('biometric_enabled', '0'); setBiometricEnabled(false); setMessage('App lock is off.'); return; }
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(supported && enrolled);
    if (!supported || !enrolled) { setMessage('Set up fingerprint or face unlock in Android Settings first.'); return; }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric lock', promptDescription: 'Confirm your fingerprint or face unlock.', cancelLabel: 'Cancel', biometricsSecurityLevel: 'weak' });
    if (!result.success) { setMessage('Biometric lock could not be enabled.'); return; }
    await setAppSetting('biometric_enabled', '1'); setBiometricEnabled(true); setMessage('Biometric lock is enabled. Authentication will be required the next time you open the app.');
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><View><Text style={styles.heading}>Settings</Text><Text style={styles.subtitle}>Customize the app to your preferences.</Text></View></View>
    <Text style={styles.section}>Profile</Text>
    <View style={styles.card}>
      <View style={styles.profileRow}>
        <View style={styles.profilePhoto}>{photo ? <Image source={{ uri: photo }} style={styles.profileImage} /> : <Ionicons name="person" size={25} color={colors.green} />}</View>
        <View style={styles.rowBody}><Text style={styles.title}>{name.trim() || 'User name'}</Text><Text style={styles.meta}>{role.trim() || 'Role'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => setProfileEditorOpen(true)} style={styles.iconAction}><Ionicons name="create-outline" size={19} color={colors.green} /></Pressable>
      </View>
      {profileMessage ? <Text style={styles.profileMessage}>{profileMessage}</Text> : null}
    </View>

    <Text style={styles.section}>Appearance</Text>
    <View style={styles.card}><View style={styles.row}><View style={styles.iconBox}><Ionicons name={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Theme</Text><Text style={styles.meta}>Choose the app-wide theme.</Text></View></View><View style={styles.themePicker}><Pressable onPress={() => setMode('light')} style={[styles.themeOption, mode === 'light' && styles.themeOptionActive]}><Ionicons name="sunny-outline" size={15} color={mode === 'light' ? colors.greenDark : colors.muted}/><Text style={[styles.themeText, mode === 'light' && styles.themeTextActive]}>Light</Text></Pressable><Pressable onPress={() => setMode('dark')} style={[styles.themeOption, mode === 'dark' && styles.themeOptionActive]}><Ionicons name="moon-outline" size={15} color={mode === 'dark' ? colors.greenDark : colors.muted}/><Text style={[styles.themeText, mode === 'dark' && styles.themeTextActive]}>Dark</Text></Pressable></View></View>

    <Text style={styles.section}>Security</Text>
    <View style={styles.card}><View style={styles.row}><View style={styles.iconBox}><Ionicons name="finger-print-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Biometric authentication</Text><Text style={styles.meta}>{biometricAvailable ? 'Use fingerprint or face unlock when opening the app.' : 'Set up fingerprint or face unlock on your device first.'}</Text></View><Switch value={biometricEnabled} onValueChange={changeBiometric} trackColor={{ false: colors.line, true: colors.greenSoft }} thumbColor={biometricEnabled ? colors.green : colors.muted}/></View></View>

    <Text style={styles.section}>Notifications</Text>
    <View style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="notifications-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Push notifications</Text><Text style={styles.meta}>{enabled ? 'Local reminder notifications are on' : 'Reminder notifications are off'}</Text></View><Switch value={enabled} onValueChange={changeNotifications} disabled={busy} trackColor={{ false: colors.line, true: colors.greenSoft }} thumbColor={enabled ? colors.green : colors.surface} /></View>
      <View style={styles.divider} />
      <View style={styles.statusRow}><View style={[styles.statusDot, permission?.granted ? styles.statusOn : styles.statusOff]} /><Text style={styles.statusText}>{permission?.granted ? 'Allowed in Android' : permission?.canAskAgain === false ? 'Blocked in Android' : 'Not enabled in Android'}</Text></View>
      <Pressable onPress={() => router.push('/reminders')} style={styles.secondaryButton}><Ionicons name="list-outline" size={16} color={colors.green} /><Text style={styles.secondaryText}>Open reminders</Text></Pressable>
      {permission?.granted ? null : <Pressable onPress={openSystemSettings} style={styles.secondaryButton}><Ionicons name="settings-outline" size={16} color={colors.green} /><Text style={styles.secondaryText}>Open permission settings</Text></Pressable>}
    </View>
    {message ? <View style={styles.message}><Ionicons name="information-circle-outline" size={17} color={colors.green} /><Text style={styles.messageText}>{message}</Text></View> : null}

    <Text style={styles.section}>Privacy and storage</Text>
    <View style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="phone-portrait-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Device-only data</Text><Text style={styles.meta}>Plans, notes, records, and reminders are stored in your phone’s local database.</Text></View></View>
      <View style={styles.divider} />
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="cloud-offline-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Offline by default</Text><Text style={styles.meta}>No account or cloud sync is required. Android delivers local notifications.</Text></View></View>
    </View>

    <Text style={styles.section}>Backup and restore</Text>
    <Pressable accessibilityRole="button" onPress={() => { setBackupMessage(''); setBackupOpen(true); }} style={styles.card}>
      <View style={styles.row}><View style={styles.iconBox}><Ionicons name="cloud-download-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Backup and restore</Text><Text style={styles.meta}>Create a local backup or choose an existing backup file.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>
    </Pressable>

    <Text style={styles.section}>App</Text>
    <View style={styles.card}><View style={styles.row}><View style={styles.iconBox}><Ionicons name="leaf-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>JW Organizer</Text><Text style={styles.meta}>Version 1.0.0 · Forest green</Text></View><Ionicons name="checkmark-circle" size={19} color={colors.green} /></View></View>
    <Text style={styles.section}>App updates</Text>
    <AppUpdateCard />
    <Text style={styles.privacy}>JW Organizer · Made for personal use</Text>
  </ScrollView>
  <Modal visible={profileEditorOpen} animationType="slide" transparent onRequestClose={() => setProfileEditorOpen(false)}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.modalBackdrop}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}><View style={styles.modalCard}>
      <View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit profile</Text><Pressable accessibilityLabel="Close" onPress={() => setProfileEditorOpen(false)}><Ionicons name="close" size={22} color={colors.ink} /></Pressable></View>
      <Pressable onPress={choosePhoto} style={styles.photoPicker}>{photo ? <Image source={{ uri: photo }} style={styles.photoPreview} /> : <View style={styles.photoPlaceholder}><Ionicons name="person" size={30} color={colors.green} /></View>}<View style={styles.photoHint}><Ionicons name="camera-outline" size={16} color={colors.green} /><Text style={styles.secondaryText}>Choose photo</Text></View></Pressable>
      <Text style={styles.fieldLabel}>Name</Text><TextInput value={name} onChangeText={(value) => { setName(value); setProfileMessage(''); }} placeholder="Enter a name" placeholderTextColor={colors.muted} style={styles.input} />
      <Text style={styles.fieldLabel}>Role</Text><TextInput value={role} onChangeText={(value) => { setRole(value); setProfileMessage(''); }} placeholder="Example: Publisher" placeholderTextColor={colors.muted} style={styles.input} />
      <Pressable onPress={saveProfile} style={styles.saveButton}><Text style={styles.saveButtonText}>Save profile</Text></Pressable>
    </View></ScrollView></View></KeyboardAvoidingView>
  </Modal>
  <Modal visible={backupOpen} animationType="slide" transparent onRequestClose={() => setBackupOpen(false)}>
    <View style={styles.modalBackdrop}><View style={styles.modalCard}>
      <View style={styles.modalHeader}><Text style={styles.modalTitle}>Backup and restore</Text><Pressable accessibilityLabel="Close" onPress={() => setBackupOpen(false)}><Ionicons name="close" size={22} color={colors.ink} /></Pressable></View>
      <Text style={styles.meta}>Export a local JSON backup or restore an existing backup file.</Text>
      <Pressable onPress={exportBackup} style={styles.backupAction}><View style={styles.iconBox}><Ionicons name="share-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Create backup</Text><Text style={styles.meta}>Choose where to save the exported file.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>
      <Pressable onPress={importBackup} style={styles.backupAction}><View style={styles.iconBox}><Ionicons name="refresh-outline" size={19} color={colors.green} /></View><View style={styles.rowBody}><Text style={styles.title}>Restore backup</Text><Text style={styles.meta}>Choose an existing JSON backup. Confirmation is required before restoring.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>
      {backupMessage ? <Text style={styles.profileMessage}>{backupMessage}</Text> : null}
    </View></View>
  </Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({safe:{flex:1,backgroundColor:colors.canvas},content:{paddingHorizontal:spacing.lg,paddingBottom:32},header:{minHeight:65,justifyContent:'center'},heading:{fontSize:26,fontWeight:'700',color:colors.ink,letterSpacing:-.6},subtitle:{fontSize:12,color:colors.muted,marginTop:4},section:{fontSize:14,fontWeight:'700',color:colors.ink,marginTop:23,marginBottom:10},card:{padding:14,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},row:{flexDirection:'row',alignItems:'center',gap:11},profileRow:{flexDirection:'row',alignItems:'center',gap:12},profilePhoto:{width:58,height:58,borderRadius:29,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center',overflow:'hidden'},profileImage:{width:'100%',height:'100%'},iconAction:{width:38,height:38,borderRadius:12,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},iconBox:{width:39,height:39,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},rowBody:{flex:1},title:{fontSize:13,fontWeight:'700',color:colors.ink},meta:{fontSize:11,color:colors.muted,marginTop:4,lineHeight:16},divider:{height:1,backgroundColor:colors.line,marginVertical:13},fieldLabel:{fontSize:11,fontWeight:'700',color:colors.ink,marginTop:9,marginBottom:5},input:{minHeight:42,paddingHorizontal:11,borderRadius:12,borderWidth:1,borderColor:colors.line,color:colors.ink,fontSize:13,backgroundColor:colors.surface},saveButton:{height:40,marginTop:13,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.green},saveButtonText:{fontSize:12,fontWeight:'700',color:colors.surface},profileMessage:{fontSize:10,color:colors.green,marginTop:8},themePicker:{flexDirection:'row',gap:8,marginTop:13},themeOption:{flex:1,minHeight:39,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderRadius:12,backgroundColor:colors.canvas},themeOptionActive:{backgroundColor:colors.greenSoft},themeText:{fontSize:11,color:colors.muted,fontWeight:'600'},themeTextActive:{color:colors.greenDark},statusRow:{flexDirection:'row',alignItems:'center',gap:8},statusDot:{width:8,height:8,borderRadius:4},statusOn:{backgroundColor:colors.green},statusOff:{backgroundColor:colors.orange},statusText:{fontSize:11,color:colors.muted},secondaryButton:{minHeight:39,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginTop:12,borderRadius:13,backgroundColor:colors.greenSoft},secondaryText:{fontSize:11,fontWeight:'700',color:colors.greenDark},message:{flexDirection:'row',alignItems:'flex-start',gap:7,padding:11,marginTop:9,borderRadius:13,backgroundColor:colors.greenSoft},messageText:{flex:1,fontSize:11,color:colors.greenDark,lineHeight:16},privacy:{fontSize:10,color:colors.muted,alignSelf:'center',marginTop:21},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.42)',justifyContent:'flex-end'},modalCard:{padding:20,paddingBottom:30,borderTopLeftRadius:24,borderTopRightRadius:24,backgroundColor:colors.surface},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},modalTitle:{fontSize:18,fontWeight:'700',color:colors.ink},photoPicker:{alignItems:'center',marginBottom:6},photoPreview:{width:84,height:84,borderRadius:42},photoPlaceholder:{width:84,height:84,borderRadius:42,backgroundColor:colors.greenSoft,alignItems:'center',justifyContent:'center'},photoHint:{flexDirection:'row',alignItems:'center',gap:6,marginTop:8},backupAction:{flexDirection:'row',alignItems:'center',gap:11,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line}});
