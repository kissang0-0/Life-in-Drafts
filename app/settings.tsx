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
import {
  saveBiometricEnabled,
  clearPIN,
  saveLockTimeout,
} from '@/lib/security';

const LOCK_TIMEOUTS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
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

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then(setBiometricAvailable);
    }
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
    if (value && Platform.OS !== 'web') {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
      });
      if (!result.success) return;
    }
    await saveBiometricEnabled(value);
    setBiometricEnabled(value);
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

  const currentTimeoutLabel = LOCK_TIMEOUTS.find(t => t.value === lockTimeoutMinutes)?.label ?? 'Immediately';

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

        {/* Profile card — taps into Me, Myself & I */}
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

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Biometric */}
          {(biometricAvailable || Platform.OS === 'web') && (
            <>
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
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            </>
          )}

          {/* Lock Timeout */}
          {hasPIN && (
            <>
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
            <Switch
              value={false}
              onValueChange={() => {}}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
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
  avatarEmoji: { fontSize: 26 },
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
