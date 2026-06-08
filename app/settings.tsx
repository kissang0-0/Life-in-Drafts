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

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { diary, memories, habits, biometricEnabled, setBiometricEnabled, notificationsEnabled, setNotificationsEnabled } = useAppStore();

  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then(setBiometricAvailable);
    }
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your archive?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { signOut(); router.replace('/auth'); } },
    ]);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value && Platform.OS !== 'web') {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
      });
      if (!result.success) return;
    }
    setBiometricEnabled(value);
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.navy} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.navy }]}>Settings</Text>
        </View>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarEmoji}>🐦</Text>
          </View>
          <View>
            <Text style={styles.profileName}>My Archive</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

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
          {biometricAvailable && (
            <View style={styles.row}>
              <Ionicons name="finger-print-outline" size={20} color={colors.navy} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Biometric Lock</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          )}
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Reminders</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={colors.navy} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Daily Journal Reminder</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
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

        {/* Brand */}
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
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  rowValue: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  divider: { height: 1, marginHorizontal: 16 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16,
  },
  signOutText: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  brand: { fontSize: 12, fontFamily: 'Nunito_400Regular', textAlign: 'center', letterSpacing: 0.5, marginTop: 8 },
});
