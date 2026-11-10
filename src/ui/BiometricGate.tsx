import { AppText as Text } from './AppText';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAppSetting, setAppSetting } from '../data/database';
import { ThemeColors, useAppTheme } from './theme';

export function BiometricGate({ children }: React.PropsWithChildren) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [canRecover, setCanRecover] = useState(false);

  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock JW Organizer',
      promptDescription: 'Use fingerprint or face unlock to open the app.',
      cancelLabel: 'Kanselahin',
      biometricsSecurityLevel: 'weak',
    });
    setUnlocked(result.success);
    return result.success;
  }, []);

  useEffect(() => {
    let active = true;
    getAppSetting('biometric_enabled', '0').then(async (value) => {
      if (value !== '1') { if (active) { setUnlocked(true); setReady(true); } return; }
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const supported = hasHardware && enrolled;
      const ok = supported ? await authenticate() : false;
      if (active) { setCanRecover(!supported); setUnlocked(ok); setReady(true); }
    }).catch(() => { if (active) { setUnlocked(true); setReady(true); } });
    return () => { active = false; };
  }, [authenticate]);

  if (!ready) return <SafeAreaView style={styles.lock}><ActivityIndicator color={colors.green} /></SafeAreaView>;
  if (unlocked) return <>{children}</>;
  const disableLock = async () => { await setAppSetting('biometric_enabled', '0'); setUnlocked(true); };
  return <SafeAreaView style={styles.lock}><View style={styles.lockIcon}><Ionicons name="finger-print-outline" size={31} color={colors.green} /></View><Text style={styles.title}>App locked</Text><Text style={styles.subtitle}>Authenticate to open JW Organizer.</Text><Pressable onPress={authenticate} style={styles.button}><Text style={styles.buttonText}>Try again</Text></Pressable>{canRecover ? <Pressable accessibilityRole="button" onPress={disableLock} style={styles.recovery}><Text style={styles.recoveryText}>Turn off biometric lock</Text></Pressable> : null}</SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  lock: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: 26 },
  lockIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  title: { marginTop: 17, color: colors.ink, fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 6, color: colors.muted, fontSize: 12, textAlign: 'center' },
  button: { minWidth: 150, height: 45, marginTop: 21, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  buttonText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  recovery: { padding: 12, marginTop: 8 },
  recoveryText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
});
