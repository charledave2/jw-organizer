import { AppText as Text } from '../ui/AppText';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrackerProvider } from '../state/TrackerContext';
import { AppThemeProvider, useAppTheme } from '../ui/theme';
import { BiometricGate } from '../ui/BiometricGate';
import { AppUpdateManager } from '../ui/AppUpdateCard';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from '@expo-google-fonts/google-sans/useFonts';
import { GoogleSans_400Regular } from '@expo-google-fonts/google-sans/400Regular';
import { GoogleSans_500Medium } from '@expo-google-fonts/google-sans/500Medium';
import { GoogleSans_600SemiBold } from '@expo-google-fonts/google-sans/600SemiBold';
import { GoogleSans_700Bold } from '@expo-google-fonts/google-sans/700Bold';

void SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function AnimatedSplash() {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(true);
  const scale = useRef(new Animated.Value(0.68)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    void SplashScreen.hideAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 120, useNativeDriver: true }),
      Animated.delay(430),
      Animated.timing(opacity, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [opacity, scale]);
  if (!visible) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, splashStyles.container, { backgroundColor: colors.green, opacity }]}>
    <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}><Image source={require('../../assets/splash-icon.png')} style={splashStyles.image} resizeMode="contain" /><Text style={splashStyles.appName}>JW Organizer</Text><Text style={splashStyles.tagline}>Personal ministry organizer</Text></Animated.View>
  </Animated.View>;
}

function AppTabs() {
  const { colors, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ GoogleSans_400Regular, GoogleSans_500Medium, GoogleSans_600SemiBold, GoogleSans_700Bold });
  if (!fontsLoaded) return null;
  return <TrackerProvider>
    <BiometricGate>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppUpdateManager />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 88 + insets.bottom,
          paddingTop: 18,
          paddingBottom: Math.max(10, insets.bottom),
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 0,
          elevation: 14,
          shadowColor: '#101813',
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: mode === 'dark' ? 0.32 : 0.12,
          shadowRadius: 12,
          paddingHorizontal: 5,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 1 },
        tabBarHideOnKeyboard: true,
        tabBarButton: ({ children, onPress, onLongPress, accessibilityLabel, accessibilityState, testID, style }) => <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={accessibilityState} testID={testID} style={style} android_ripple={{ color: colors.greenSoft, borderless: true, radius: 27 }}>{children}</Pressable>,
      }}>
        <Tabs.Screen name="notes" options={{ title: 'Notes', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <View style={[splashStyles.homeTab, { backgroundColor: focused ? colors.green : colors.greenSoft, borderColor: colors.surface }]}><Ionicons name="leaf" color={focused ? '#FFFFFF' : colors.green} size={23} /></View> }} />
        <Tabs.Screen name="plan" options={{ title: 'Personal', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'book' : 'book-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="reminders" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>
    </BiometricGate>
    <AnimatedSplash />
  </TrackerProvider>;
}

export default function RootLayout() {
  return <SafeAreaProvider><AppThemeProvider><AppTabs /></AppThemeProvider></SafeAreaProvider>;
}

const splashStyles = StyleSheet.create({
  container: { zIndex: 99, alignItems: 'center', justifyContent: 'center' },
  image: { width: 146, height: 146 },
  appName: { marginTop: 22, color: '#FFFFFF', fontSize: 23, fontWeight: '700', letterSpacing: 0.2 },
  tagline: { marginTop: 6, color: '#D7E7DD', fontSize: 12, fontWeight: '500', letterSpacing: 0.4 },
  homeTab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 4, marginTop: -8, elevation: 10, shadowColor: '#101813', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 7, zIndex: 2 },
});
