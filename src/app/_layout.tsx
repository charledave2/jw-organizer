import { AppText as Text } from '../ui/AppText';
import { useEffect, useRef, useState } from 'react';
import { Animated, ColorValue, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
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

function CenteredTabButton({ children, highlightColor, onPress, onPressIn, onPressOut, accessibilityLabel, ...props }: any) {
  const haloScale = useRef(new Animated.Value(0.75)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconLift = useRef(new Animated.Value(0)).current;
  const isCreateButton = accessibilityLabel === 'Create a note';
  const animatePress = (pressed: boolean) => {
    Animated.parallel([
      Animated.spring(haloScale, { toValue: pressed ? 1 : 0.75, damping: 13, stiffness: 260, useNativeDriver: true }),
      ...(isCreateButton ? [
        Animated.spring(iconScale, { toValue: pressed ? 0.88 : 1, damping: 8, stiffness: 300, useNativeDriver: true }),
      ] : []),
    ]).start();
  };
  const animateCreateTap = () => {
    iconLift.stopAnimation();
    iconScale.stopAnimation();
    iconLift.setValue(0);
    iconScale.setValue(1);
    Animated.sequence([
    Animated.parallel([
      Animated.timing(iconLift, { toValue: -10, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 0.82, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1.04, damping: 5, stiffness: 260, useNativeDriver: true }),
      ]),
    ]),
    Animated.parallel([
      Animated.spring(iconLift, { toValue: 0, damping: 6, stiffness: 250, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, damping: 6, stiffness: 240, useNativeDriver: true }),
    ]),
    ]).start();
  };
  return <Pressable {...props} accessibilityLabel={accessibilityLabel} onPress={(event: any) => { onPress?.(event); if (isCreateButton) animateCreateTap(); }} onPressIn={(event: any) => { onPressIn?.(event); animatePress(true); }} onPressOut={(event: any) => { onPressOut?.(event); animatePress(false); }}>
    <Animated.View pointerEvents="none" style={[tabButtonStyles.touchHalo, { backgroundColor: highlightColor, opacity: props.accessibilityState?.selected ? 1 : 0, width: isCreateButton ? 58 : 34, height: isCreateButton ? 58 : 34, borderRadius: isCreateButton ? 29 : 17, marginLeft: isCreateButton ? -29 : -17, marginTop: isCreateButton ? -25 : -17, transform: [{ scale: haloScale }] }]} />
    <Animated.View style={isCreateButton ? { transform: [{ translateY: iconLift }, { scale: iconScale }] } : undefined}>
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </Animated.View>
  </Pressable>;
}

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
          height: 90 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(10, insets.bottom) + 8,
          paddingHorizontal: 18,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'visible',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 0 },
        tabBarBackground: () => <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[tabBarStyles.glassPill, {
            top: 6,
            left: 18,
            right: 18,
            bottom: Math.max(10, insets.bottom) + 8,
            backgroundColor: mode === 'dark' ? 'rgba(27,36,32,0.96)' : 'rgba(255,255,255,0.94)',
            borderColor: colors.line,
          }]} />
        </View>,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => <CenteredTabButton {...props} highlightColor={colors.greenSoft} />,
      }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home', tabBarLabel: ({ color, focused }) => <TabLabel title="Home" color={color} focused={focused} activeColor={colors.green} />, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="records" options={{ title: 'Records', tabBarLabel: ({ color, focused }) => <TabLabel title="Records" color={color} focused={focused} activeColor={colors.green} />, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="notes" options={{ title: 'Notes', tabBarAccessibilityLabel: 'Create a note', tabBarLabel: ({ color, focused }) => <TabLabel title="Notes" color={color} focused={focused} activeColor={colors.green} />, tabBarIcon: () => <View style={[splashStyles.createTab, { backgroundColor: colors.green, borderColor: colors.surface }]}><Ionicons name="add" color="#FFFFFF" size={30} /></View> }} />
        <Tabs.Screen name="plan" options={{ title: 'Personal', tabBarLabel: ({ color, focused }) => <TabLabel title="Personal" color={color} focused={focused} activeColor={colors.green} />, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'book' : 'book-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarLabel: ({ color, focused }) => <TabLabel title="Settings" color={color} focused={focused} activeColor={colors.green} />, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="activity" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="reminders" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>
    </BiometricGate>
    <AnimatedSplash />
  </TrackerProvider>;
}

function TabLabel({ title, color, focused, activeColor }: { title: string; color: ColorValue; focused: boolean; activeColor: string }) {
  return <View style={tabBarStyles.labelWrap}>
    <Text style={[tabBarStyles.label, { color }]} numberOfLines={1}>{title}</Text>
    <View style={tabBarStyles.activeMarkTrack}><Animated.View style={[tabBarStyles.activeMark, { backgroundColor: activeColor, transform: [{ scale: focused ? 1 : 0 }] }]} /></View>
  </View>;
}

export default function RootLayout() {
  return <SafeAreaProvider><AppThemeProvider><AppTabs /></AppThemeProvider></SafeAreaProvider>;
}

const splashStyles = StyleSheet.create({
  container: { zIndex: 99, alignItems: 'center', justifyContent: 'center' },
  image: { width: 146, height: 146 },
  appName: { marginTop: 22, color: '#FFFFFF', fontSize: 23, fontWeight: '700', letterSpacing: 0.2 },
  tagline: { marginTop: 6, color: '#D7E7DD', fontSize: 12, fontWeight: '500', letterSpacing: 0.4 },
  createTab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 3, marginTop: -15, elevation: 10, shadowColor: '#315E4B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.34, shadowRadius: 9, zIndex: 2 },
});

const tabButtonStyles = StyleSheet.create({ touchHalo: { position: 'absolute', top: '50%', left: '50%' } });
const tabBarStyles = StyleSheet.create({
  glassPill: { position: 'absolute', borderRadius: 30, borderWidth: 1, elevation: 16, shadowColor: '#101813', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 12 },
  labelWrap: { minHeight: 27, alignItems: 'center', justifyContent: 'flex-start' },
  label: { fontSize: 10, fontWeight: '600', lineHeight: 14 },
  activeMarkTrack: { width: 22, height: 4, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  activeMark: { width: 6, height: 4, borderRadius: 3 },
});
