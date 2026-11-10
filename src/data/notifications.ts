import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getReminders, Reminder, setReminderNotificationId } from './database';

export const REMINDER_CHANNEL_ID = 'reminders';

export async function configureReminderChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 180, 250],
    lightColor: '#315E4B',
  });
}

export async function requestReminderPermission() {
  await configureReminderChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return current;
  return Notifications.requestPermissionsAsync();
}

export async function scheduleReminderNotification(reminder: Reminder) {
  const triggerDate = new Date(`${reminder.reminder_date}T${reminder.reminder_time}:00`);
  if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) return '';
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.details || reminder.category,
      sound: 'default',
      data: { reminderId: reminder.id },
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID, color: '#315E4B' } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}) },
  });
  await setReminderNotificationId(reminder.id, notificationId);
  return notificationId;
}

export async function cancelReminderNotification(notificationId: string) {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function refreshScheduledReminders(enabled: boolean, allowRequest = false) {
  const permission = enabled && allowRequest ? await requestReminderPermission() : await Notifications.getPermissionsAsync();
  const reminders = await getReminders();
  for (const reminder of reminders) {
    await cancelReminderNotification(reminder.notification_id);
    await setReminderNotificationId(reminder.id, '');
    if (enabled && permission.granted && !reminder.completed) await scheduleReminderNotification(reminder);
  }
  return permission;
}
