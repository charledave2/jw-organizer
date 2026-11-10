import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TrackerProvider } from '../state/TrackerContext';
import { colors } from '../ui/theme';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TrackerProvider>
        <StatusBar style="dark" />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.green,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: {
              height: 68,
              paddingTop: 9,
              paddingBottom: 9,
              backgroundColor: colors.surface,
              borderTopColor: colors.line,
              elevation: 0,
            },
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
          <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
          <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
          <Tabs.Screen name="notes" options={{ title: 'Notes', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
          <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} /> }} />
          <Tabs.Screen name="calendar" options={{ href: null }} />
          <Tabs.Screen name="reports" options={{ href: null }} />
          <Tabs.Screen name="reminders" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null }} />
        </Tabs>
      </TrackerProvider>
    </SafeAreaProvider>
  );
}
