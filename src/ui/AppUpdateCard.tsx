import { AppText as Text } from './AppText';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { ThemeColors, useAppTheme } from './theme';

const releasesApi = 'https://api.github.com/repos/charledave2/jw-organizer/releases?per_page=100';
const packageName = 'com.charledave.jworganizer';
type Release = { tag_name: string; name: string; body?: string; assets: { name: string; browser_download_url: string }[] };
type Update = Release & { buildNumber: number; apkUrl: string };

function getInstalledBuild() {
  const values = [
    Application.nativeBuildVersion,
    Constants.nativeBuildVersion,
    Constants.expoConfig?.android?.versionCode?.toString(),
  ];
  const builds = values.map((value) => Number.parseInt(value ?? '', 10)).filter((value) => Number.isFinite(value) && value > 0);
  return builds.length ? Math.max(...builds) : 1;
}

async function findUpdate(installedBuild: number): Promise<Update | null> {
  if (Platform.OS !== 'android') return null;
  const response = await fetch(releasesApi, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`Update check failed (${response.status})`);
  const releases = await response.json() as Release[];
  const candidates = releases.flatMap((release) => {
    const match = release.tag_name.match(/^build-(\d+)$/);
    return match ? [{ release, buildNumber: Number(match[1]) }] : [];
  }).sort((a, b) => b.buildNumber - a.buildNumber);
  const latest = candidates[0];
  if (!latest || latest.buildNumber <= installedBuild) return null;
  const apk = latest.release.assets.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
  return apk ? { ...latest.release, buildNumber: latest.buildNumber, apkUrl: apk.browser_download_url } : null;
}

export function AppUpdateManager() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const installedBuild = getInstalledBuild();
  const [update, setUpdate] = useState<Update | null>(null);
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [downloadedUri, setDownloadedUri] = useState('');
  const backgrounded = useRef(false);
  const check = useCallback(async () => {
    setChecking(true);
    try {
      const latest = await findUpdate(installedBuild);
      setUpdate(latest);
      if (latest) { setMessage('A new version is available. Update now, or choose Later to postpone until you reopen the app.'); setVisible(true); }
      else { setMessage(''); setVisible(false); }
    } catch { setMessage('Could not check for updates. The app will try again when opened.'); }
    finally { setChecking(false); }
  }, [installedBuild]);
  useEffect(() => {
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { backgrounded.current = true; return; }
      if (backgrounded.current) { backgrounded.current = false; void check(); }
    });
    return () => subscription.remove();
  }, [check]);

  const install = async (uri: string) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, type: 'application/vnd.android.package-archive', flags: 1 });
      setMessage('Confirm the update in the Android installer.');
    } catch {
      setMessage('Allow JW Organizer to install unknown apps in Android settings, then return and try again.');
      try { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, { data: `package:${packageName}` }); } catch { /* Per-app settings may be unavailable on some devices. */ }
    }
  };
  const download = async () => {
    if (!update) return;
    if (downloadedUri) { await install(downloadedUri); return; }
    if (!FileSystem.cacheDirectory) { setMessage('A temporary download location is unavailable.'); return; }
    setDownloading(true); setProgress(0); setMessage('Downloading update…');
    const destination = `${FileSystem.cacheDirectory}jw-organizer-${update.tag_name}.apk`;
    try {
      await FileSystem.deleteAsync(destination, { idempotent: true });
      const task = FileSystem.createDownloadResumable(update.apkUrl, destination, {}, (event) => { if (event.totalBytesExpectedToWrite > 0) setProgress(Math.round(event.totalBytesWritten / event.totalBytesExpectedToWrite * 100)); });
      const result = await task.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300) throw new Error('APK download failed');
      setDownloadedUri(result.uri); setMessage('Download complete. Confirm the update in Android installer.'); await install(result.uri);
    } catch { setMessage('The update could not be downloaded. Check your connection and try again.'); }
    finally { setDownloading(false); }
  };
  const later = () => setVisible(false);
  return <Modal visible={visible} animationType="fade" transparent onRequestClose={later}><View style={styles.backdrop}><View style={styles.modal}>
    <View style={styles.icon}><Ionicons name="cloud-download-outline" size={25} color={colors.green}/></View>
    <Text style={styles.title}>JW Organizer update</Text>
    <Text style={styles.version}>{update?.name || `Feature build ${update?.buildNumber ?? ''}`}</Text>
    {!!update?.body?.trim() && <Text style={styles.notes}>{update.body.trim()}</Text>}
    <Text style={styles.message}>{checking ? 'Checking for updates…' : downloading ? `Downloading in the app… ${progress}%` : message}</Text>
    {downloading ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]}/></View> : null}
    <Pressable onPress={download} disabled={checking || downloading || !update} style={[styles.primary, (!update || checking || downloading) && styles.disabled]}>{checking || downloading ? <ActivityIndicator size="small" color={colors.surface}/> : <Ionicons name={downloadedUri ? 'download' : 'arrow-down-circle-outline'} size={18} color={colors.surface}/>}<Text style={styles.primaryText}>{downloading ? 'Downloading…' : downloadedUri ? 'Install update' : 'Update now'}</Text></Pressable>
    <Pressable onPress={later} style={styles.later}><Text style={styles.laterText}>Later</Text></Pressable>
  </View></View></Modal>;
}

export function AppUpdateCard() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const build = getInstalledBuild();
  return <View style={styles.card}><View style={styles.cardIcon}><Ionicons name="cloud-download-outline" size={19} color={colors.green}/></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Automatic app updates</Text><Text style={styles.cardMessage}>New releases are checked when the app opens or returns to the foreground. Updates appear in a popup and download inside the app.</Text><Text style={styles.cardMeta}>Installed build: {build}</Text></View></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ backdrop:{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,.48)'},modal:{padding:21,borderRadius:24,backgroundColor:colors.surface},icon:{width:49,height:49,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft,marginBottom:13},title:{fontSize:19,fontWeight:'700',color:colors.ink},version:{fontSize:12,fontWeight:'700',color:colors.green,marginTop:6},notes:{maxHeight:110,fontSize:11,lineHeight:16,color:colors.muted,marginTop:9},message:{fontSize:11,lineHeight:16,color:colors.muted,marginTop:11},progressTrack:{height:5,overflow:'hidden',borderRadius:3,backgroundColor:colors.line,marginTop:10},progressFill:{height:'100%',backgroundColor:colors.green},primary:{minHeight:47,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:15,borderRadius:15,backgroundColor:colors.green},disabled:{opacity:.65},primaryText:{fontSize:13,fontWeight:'700',color:colors.surface},later:{minHeight:42,alignItems:'center',justifyContent:'center',marginTop:4},laterText:{fontSize:12,fontWeight:'700',color:colors.muted},card:{padding:14,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,flexDirection:'row',alignItems:'flex-start',gap:11},cardIcon:{width:39,height:39,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.greenSoft},cardTitle:{fontSize:13,fontWeight:'700',color:colors.ink},cardMessage:{fontSize:11,lineHeight:16,color:colors.muted,marginTop:5},cardMeta:{fontSize:10,color:colors.muted,marginTop:7} });
