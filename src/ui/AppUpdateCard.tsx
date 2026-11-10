import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { ThemeColors, useAppTheme } from './theme';

const releasesApi = 'https://api.github.com/repos/charledave2/jw-organizer/releases?per_page=100';
const packageName = 'com.charledave.jworganizer';
type Release = { tag_name: string; name: string; body?: string; html_url: string; assets: { name: string; browser_download_url: string; size: number }[] };

export function AppUpdateCard() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const installedBuild = Number.parseInt(Constants.nativeBuildVersion ?? '1', 10) || 1;
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [release, setRelease] = useState<(Release & { buildNumber: number; apkUrl: string }) | null>(null);
  const [downloadedUri, setDownloadedUri] = useState('');
  const [message, setMessage] = useState('');

  const checkForUpdate = async () => {
    setChecking(true); setMessage(''); setRelease(null); setDownloadedUri('');
    try {
      if (Platform.OS !== 'android') { setMessage('Android lang ang APK updater na ito.'); return; }
      const response = await fetch(releasesApi, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = await response.json() as Release[];
      const builds = items.flatMap((item) => {
        const match = item.tag_name.match(/^build-(\d+)$/);
        return match ? [{ item, buildNumber: Number(match[1]) }] : [];
      }).sort((a, b) => b.buildNumber - a.buildNumber);
      const latestBuild = builds[0];
      if (!latestBuild) { setMessage('Wala pang release build. Subukan muli mamaya.'); return; }
      const { item: latest, buildNumber } = latestBuild;
      const apk = latest.assets.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
      if (!buildNumber || !apk) { setMessage('Hindi makita ang installable APK sa pinakabagong release.'); return; }
      if (buildNumber <= installedBuild) { setMessage('Naka-install na ang pinakabagong build.'); return; }
      setRelease({ ...latest, buildNumber, apkUrl: apk.browser_download_url });
      setMessage('May bagong feature build na puwede mong i-download.');
    } catch { setMessage('Hindi ma-check ang updates. Tingnan ang internet connection at subukan ulit.'); }
    finally { setChecking(false); }
  };

  const openInstaller = async (uri: string) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1,
      });
      setMessage('Buksan ang Android installer at kumpirmahin ang update.');
    } catch {
      setMessage('Payagan ang “Install unknown apps” para sa JW Organizer, bumalik dito, at pindutin ulit ang Install update.');
      try { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, { data: `package:${packageName}` }); } catch { /* Some Android builds do not expose the per-app setting screen. */ }
    }
  };

  const downloadUpdate = async () => {
    if (!release) return;
    if (downloadedUri) { await openInstaller(downloadedUri); return; }
    if (!FileSystem.cacheDirectory) { setMessage('Hindi makagawa ng temporary download sa device na ito.'); return; }
    setDownloading(true); setProgress(0); setMessage('');
    const destination = `${FileSystem.cacheDirectory}jw-organizer-${release.tag_name}.apk`;
    try {
      await FileSystem.deleteAsync(destination, { idempotent: true });
      const task = FileSystem.createDownloadResumable(release.apkUrl, destination, {}, (event) => {
        if (event.totalBytesExpectedToWrite > 0) setProgress(Math.round(event.totalBytesWritten / event.totalBytesExpectedToWrite * 100));
      });
      const result = await task.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300) throw new Error('APK download failed');
      setDownloadedUri(result.uri);
      setMessage('Tapos na ang download. Buksan ang Android installer para i-update ang app.');
      await openInstaller(result.uri);
    } catch { setMessage('Hindi na-download ang APK. Subukan ulit kapag maayos ang internet connection.'); }
    finally { setDownloading(false); }
  };

  return <View style={styles.card}>
    <View style={styles.headingRow}>
      <View style={styles.icon}><Ionicons name="cloud-download-outline" size={19} color={colors.green} /></View>
      <View style={styles.body}><Text style={styles.title}>App updates</Text><Text style={styles.meta}>Naka-install na build: {installedBuild}</Text></View>
    </View>
    <Text style={styles.description}>Tingnan at i-install ang mga bagong ARM64 feature build mula sa GitHub Releases.</Text>
    <Pressable onPress={checkForUpdate} disabled={checking || downloading} style={styles.primary}>
      {checking ? <ActivityIndicator size="small" color={colors.surface} /> : <Ionicons name="refresh" size={16} color={colors.surface} />}
      <Text style={styles.primaryText}>{checking ? 'Tinitingnan…' : 'Tingnan kung may update'}</Text>
    </Pressable>
    {release ? <View style={styles.releaseBox}>
      <Text style={styles.releaseTitle}>{release.name || `Feature build ${release.buildNumber}`}</Text>
      {!!release.body?.trim() && <Text style={styles.releaseNotes} numberOfLines={4}>{release.body.trim()}</Text>}
      {downloading && progress !== null ? <Text style={styles.progress}>Nagda-download… {progress}%</Text> : null}
      <Pressable onPress={downloadUpdate} disabled={downloading} style={styles.secondary}>
        {downloading ? <ActivityIndicator size="small" color={colors.green} /> : <Ionicons name={downloadedUri ? 'download' : 'arrow-down-circle-outline'} size={17} color={colors.green} />}
        <Text style={styles.secondaryText}>{downloadedUri ? 'Install update' : downloading ? 'Nagda-download…' : 'I-download at i-install'}</Text>
      </Pressable>
    </View> : null}
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {Platform.OS !== 'android' ? <Text style={styles.message}>Android lang ang APK updater na ito.</Text> : null}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  body: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  description: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 11 },
  primary: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: 13, backgroundColor: colors.green },
  primaryText: { fontSize: 11, fontWeight: '700', color: colors.surface },
  releaseBox: { padding: 12, marginTop: 12, borderRadius: 14, backgroundColor: colors.greenSoft },
  releaseTitle: { fontSize: 12, fontWeight: '700', color: colors.ink },
  releaseNotes: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 5 },
  progress: { fontSize: 11, color: colors.greenDark, marginTop: 8 },
  secondary: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, borderRadius: 12, backgroundColor: colors.surface },
  secondaryText: { fontSize: 11, fontWeight: '700', color: colors.greenDark },
  message: { fontSize: 10, lineHeight: 15, color: colors.muted, marginTop: 9 },
});
