import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFICATION_ID_KEY = 'lid_daily_reminder_id';
const NOTIFICATION_TIME_KEY = 'lid_reminder_time';
const NOTIFICATION_ENABLED_KEY = 'lid_reminder_enabled';

const store = {
  get: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return localStorage.getItem(key);
      const SecureStore = await import('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  },
  set: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  delete: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
      const SecureStore = await import('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') return { success: false, error: 'Notifications are only available on mobile.' };

  await cancelDailyReminder();

  const granted = await requestNotificationPermission();
  if (!granted) return { success: false, error: 'Permission denied. Please enable notifications in your device settings.' };

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📖 Life in Drafts',
        body: "Your archive is waiting. Take a moment to write today's story. ✨",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await store.set(NOTIFICATION_ID_KEY, id);
    await store.set(NOTIFICATION_TIME_KEY, JSON.stringify({ hour, minute }));
    await store.set(NOTIFICATION_ENABLED_KEY, '1');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Could not schedule reminder. Please try again.' };
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  const id = await store.get(NOTIFICATION_ID_KEY);
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    await store.delete(NOTIFICATION_ID_KEY);
  }
  await store.set(NOTIFICATION_ENABLED_KEY, '0');
}

export async function getReminderEnabled(): Promise<boolean> {
  const val = await store.get(NOTIFICATION_ENABLED_KEY);
  return val === '1';
}

export async function getReminderTime(): Promise<{ hour: number; minute: number }> {
  const raw = await store.get(NOTIFICATION_TIME_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return { hour: 20, minute: 0 };
}
