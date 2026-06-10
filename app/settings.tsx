import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { useSecurityStore } from '@/store/securityStore';
import NimbusBird from '@/components/NimbusBird';
import Toast from '@/components/Toast';
import {
  saveBiometricEnabled,
  clearPIN,
  saveLockTimeout,
} from '@/lib/security';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  getReminderEnabled,
  getReminderTime,
} from '@/lib/notifications';

const LOCK_TIMEOUTS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
];

const REMINDER_HOURS = [
  { label: '6:00 AM', hour: 6, minute: 0 },
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '7:00 PM', hour: 19, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
  { label: '10:00 PM', hour: 22, minute: 0 },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, resetPassword } = useAuthStore();
  const { diary, memories, habits } = useAppStore();
  const {
    hasPIN,
    biometricEnabled,
    lockTimeoutMinutes,
    lock,
    setBiometricEnabled,
    setLockTimeout,
    setHasPIN,
  } = useSecurityStore();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false, message: '', type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then(setBiometricAvailable);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const enabled = await getReminderEnabled();
      const time = await getReminderTime();
      setNotificationsEnabled(enabled);
      setReminderHour(time.hour);
      setReminderMinute(time.minute);
    })();
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your archive?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: () => {
          signOut();
          router.replace('/auth');
        }
      },
    ]);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
      });
      if (!result.success) return;
    }
    await saveBiometricEnabled(value);
    setBiometricEnabled(value);
    showToast(value ? '🔒 Biometric lock enabled' : 'Biometric lock disabled', 'success');
  };

  const handlePINAction = () => {
    if (hasPIN) {
      Alert.alert('PIN', 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change PIN', onPress: () => router.push('/pin-setup'),
        },
        {
          text: 'Remove PIN', style: 'destructive', onPress: () => {
            Alert.alert('Remove PIN', 'This will disable the app lock. Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove', style: 'destructive', onPress: async () => {
                  await clearPIN();
                  setHasPIN(false);
                }
              },
            ]);
          }
        },
      ]);
    } else {
      router.push('/pin-setup');
    }
  };

  const handleLockTimeout = async (minutes: number) => {
    await saveLockTimeout(minutes);
    setLockTimeout(minutes);
    setShowTimeoutPicker(false);
  };

  const handleEmergencyLock = () => {
    lock();
  };

  const handleResetPassword = () => {
    if (!user?.email) return;
    Alert.alert(
      'Reset Password',
      `Send a password reset email to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: async () => {
            setResetLoading(true);
            const result = await resetPassword(user.email!);
            setResetLoading(false);
            if (result.success) {
              showToast('💌 Reset email sent! Check your inbox.', 'success');
            } else {
              showToast(result.error ?? 'Could not send reset email.', 'error');
            }
          },
        },
      ]
    );
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (Platform.OS === 'web') {
      showToast('Journal reminders are only available on mobile.', 'info');
      return;
    }
    setNotifLoading(true);
    if (value) {
      const result = await scheduleDailyReminder(reminderHour, reminderMinute);
      if (result.success) {
        setNotificationsEnabled(true);
        const label = REMINDER_HOURS.find(h => h.hour === reminderHour && h.minute === reminderMinute)?.label ?? `${reminderHour}:${String(reminderMinute).padStart(2, '0')}`;
        showToast(`🔔 Reminder set for ${label} daily`, 'success');
      } else {
        showToast(result.error ?? 'Could not set reminder.', 'error');
      }
    } else {
      await cancelDailyReminder();
      setNotificationsEnabled(false);
      showToast('Reminder turned off', 'info');
    }
    setNotifLoading(false);
  };

  const handleReminderTimeChange = async (hour: number, minute: number) => {
    setReminderHour(hour);
    setReminderMinute(minute);
    setShowTimePicker(false);
    if (notificationsEnabled) {
      const result = await scheduleDailyReminder(hour, minute);
      if (result.success) {
        const label = REMINDER_HOURS.find(h => h.hour === hour && h.minute === minute)?.label ?? `${hour}:${String(minute).padStart(2, '0')}`;
        showToast(`🔔 Reminder updated to ${label}`, 'success');
      }
    }
  };

  const currentTimeoutLabel = LOCK_TIMEOUTS.find(t => t.value === lockTimeoutMinutes)?.label ?? 'Immediately';
  const currentReminderLabel = REMINDER_HOURS.find(h => h.hour === reminderHour && h.minute === reminderMinute)?.label ?? `${reminderHour}:${String(reminderMinute).padStart(2, '0')}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 40 : insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.navy} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.navy }]}>Settings</Text>
        </View>

        {/* Profile card */}
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          activeOpacity={0.85}
          style={[styles.profileCard, { backgroundColor: colors.primary }]}
        >
          <View style={styles.profileAvatar}>
            <NimbusBird size={46} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Me, Myself & I</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
          <View style={styles.profileArrow}>
            <View style={[styles.ownerBadge]}>
              <Ionicons name="shield-checkmark" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.ownerText}>Owner</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{diary.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Entries</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={[styles.statNum, { color: colors.lavenderDeep }]}>{memories.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Memories</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={[styles.statNum, { color: colors.accentDeep }]}>{habits.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Habits</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Account</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <TouchableOpacity style={styles.row} onPress={handleResetPassword} activeOpacity={0.7} disabled={resetLoading}>
            <Ionicons name="key-outline" size={20} color={colors.navy} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Reset Password</Text>
            <View style={styles.rowRight}>
              {resetLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              }
            </View>
          </TouchableOpacity>
        </View>

        {/* Security */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Security</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>

          {/* PIN Lock */}
          <TouchableOpacity style={styles.row} onPress={handlePINAction} activeOpacity={0.7}>
            <Ionicons name="keypad-outline" size={20} color={colors.navy} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {hasPIN ? 'Change PIN' : 'Set Up PIN Lock'}
            </Text>
            <View style={styles.rowRight}>
              {hasPIN && (
                <View style={[styles.activeBadge, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.activeBadgeText, { color: colors.success }]}>On</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          {/* Biometric — only show when native hardware is available */}
          {biometricAvailable && Platform.OS !== 'web' && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.row}>
                <Ionicons name="finger-print-outline" size={20} color={colors.navy} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Biometric Lock</Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  disabled={!hasPIN}
                />
              </View>
              {!hasPIN && (
                <Text style={[styles.rowHint, { color: colors.textLight }]}>Set up a PIN first to enable biometrics</Text>
              )}
            </>
          )}

          {/* Lock Timeout */}
          {hasPIN && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <TouchableOpacity style={styles.row} onPress={() => setShowTimeoutPicker(!showTimeoutPicker)} activeOpacity={0.7}>
                <Ionicons name="timer-outline" size={20} color={colors.navy} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Lock After</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: colors.textMuted }]}>{currentTimeoutLabel}</Text>
                  <Ionicons name={showTimeoutPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textLight} />
                </View>
              </TouchableOpacity>
              {showTimeoutPicker && (
                <View style={[styles.pickerList, { borderTopColor: colors.borderLight }]}>
                  {LOCK_TIMEOUTS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.pickerRow, { borderBottomColor: colors.borderLight }]}
                      onPress={() => handleLockTimeout(opt.value)}
                    >
                      <Text style={[styles.pickerText, { color: colors.text }]}>{opt.label}</Text>
                      {lockTimeoutMinutes === opt.value && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Emergency Lock */}
        {hasPIN && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Emergency</Text>
            <TouchableOpacity
              onPress={handleEmergencyLock}
              style={[styles.emergencyBtn, { backgroundColor: '#1A1A2E', borderColor: '#7EC8E3' + '30' }]}
              activeOpacity={0.85}
            >
              <Ionicons name="lock-closed" size={18} color="#7EC8E3" />
              <Text style={styles.emergencyText}>Lock Archive Now</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Reminders</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={colors.navy} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Daily Journal Reminder</Text>
            {notifLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              )
            }
          </View>

          {notificationsEnabled && Platform.OS !== 'web' && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => setShowTimePicker(!showTimePicker)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={colors.navy} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Reminder Time</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: colors.textMuted }]}>{currentReminderLabel}</Text>
                  <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textLight} />
                </View>
              </TouchableOpacity>
              {showTimePicker && (
                <View style={[styles.pickerList, { borderTopColor: colors.borderLight }]}>
                  {REMINDER_HOURS.map((opt) => (
                    <TouchableOpacity
                      key={`${opt.hour}:${opt.minute}`}
                      style={[styles.pickerRow, { borderBottomColor: colors.borderLight }]}
                      onPress={() => handleReminderTimeChange(opt.hour, opt.minute)}
                    >
                      <Text style={[styles.pickerText, { color: colors.text }]}>{opt.label}</Text>
                      {reminderHour === opt.hour && reminderMinute === opt.minute && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {Platform.OS === 'web' && (
            <Text style={[styles.rowHint, { color: colors.textLight, paddingBottom: 10 }]}>
              Journal reminders are available on the mobile app
            </Text>
          )}
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>About</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <View style={styles.row}>
            <Ionicons name="information-circle-outline" size={20} color={colors.navy} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.row}>
            <Ionicons name="cloud-outline" size={20} color={colors.navy} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Cloud Sync</Text>
            <Text style={[styles.rowValue, { color: colors.success }]}>Active</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.signOutBtn, { backgroundColor: colors.errorLight, borderColor: colors.error + '30' }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.brand, { color: colors.textLight }]}>Life in Drafts · The Archive of Becoming</Text>
      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20,
    borderRadius: 20, marginBottom: 20,
  },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  profileEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  profileArrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  ownerText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontFamily: 'Nunito_700Bold' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statItem: {
    flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, gap: 4,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  statNum: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold' },
  statLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  sectionLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  section: {
    borderRadius: 16, marginBottom: 16, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  rowValue: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  rowHint: { fontSize: 12, fontFamily: 'Nunito_400Regular', paddingHorizontal: 16, paddingBottom: 10, marginTop: -4 },
  divider: { height: 1, marginHorizontal: 16 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activeBadgeText: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  pickerList: { borderTopWidth: 1 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  pickerText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  emergencyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16,
  },
  emergencyText: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#7EC8E3' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16,
  },
  signOutText: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  brand: { fontSize: 12, fontFamily: 'Nunito_400Regular', textAlign: 'center', letterSpacing: 0.5, marginTop: 8 },
});
