import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useSecurityStore } from '@/store/securityStore';
import {
  hasVaultPINSet,
  verifyVaultPIN,
  saveVaultPIN,
} from '@/lib/security';
import { subscribeVault, addVaultEntry, deleteVaultEntry, VaultEntry } from '@/lib/firestore';
import PINPad from '@/components/PINPad';
import PINSetupScreen from '@/app/pin-setup';

type VaultState = 'loading' | 'setup' | 'locked' | 'unlocked';

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { biometricEnabled } = useSecurityStore();

  const [vaultState, setVaultState] = useState<VaultState>('loading');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [bioAvailable, setBioAvailable] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    checkVaultState();
    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then(setBioAvailable);
    }
  }, []);

  useEffect(() => {
    if (vaultState === 'unlocked' && user?.uid) {
      const unsub = subscribeVault(user.uid, setEntries);
      return unsub;
    }
  }, [vaultState, user?.uid]);

  const checkVaultState = async () => {
    const hasVault = await hasVaultPINSet();
    setVaultState(hasVault ? 'locked' : 'setup');
  };

  const triggerBiometric = async () => {
    if (Platform.OS === 'web' || !bioAvailable) return;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock your Secret Vault',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    if (result.success) setVaultState('unlocked');
  };

  useEffect(() => {
    if (vaultState === 'locked' && bioAvailable && biometricEnabled) {
      setTimeout(triggerBiometric, 300);
    }
  }, [vaultState, bioAvailable, biometricEnabled]);

  const handlePINChange = async (val: string) => {
    setPin(val);
    if (val.length === 4) {
      const ok = await verifyVaultPIN(val);
      if (ok) {
        setVaultState('unlocked');
        setPin('');
      } else {
        setPinError('Incorrect vault PIN');
        setPin('');
        setTimeout(() => setPinError(''), 2000);
      }
    }
  };

  const handleVaultSetupDone = async (createdPin: string) => {
    await saveVaultPIN(createdPin);
    setVaultState('unlocked');
  };

  const handleDelete = (entry: VaultEntry) => {
    Alert.alert('Delete from Vault', 'Remove this entry permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (user?.uid) await deleteVaultEntry(user.uid, entry.id);
        }
      },
    ]);
  };

  if (vaultState === 'loading') return null;

  if (vaultState === 'setup') {
    return <PINSetupScreen isVault onDone={() => setVaultState('unlocked')} />;
  }

  if (vaultState === 'locked') {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.lockGradient}>
        <View style={[styles.lockInner, { paddingTop: topPad + 20 }]}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any)} style={[styles.backBtn, { top: topPad + 8 }]}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={40} color="#7EC8E3" />
          </View>
          <Text style={styles.lockTitle}>Secret Vault</Text>
          <Text style={styles.lockSubtitle}>Enter your vault PIN</Text>
          <PINPad
            value={pin}
            length={4}
            onChange={handlePINChange}
            onBiometric={triggerBiometric}
            showBiometric={bioAvailable && biometricEnabled && Platform.OS !== 'web'}
            error={pinError}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Ionicons name="lock-closed" size={18} color="#7EC8E3" />
            <Text style={styles.headerTitle}>Secret Vault</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/vault/new')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subheading}>Private & encrypted. Hidden from everything.</Text>

        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>Your vault is empty</Text>
            <Text style={styles.emptyText}>Add hidden entries that never appear in search or dashboards.</Text>
          </View>
        ) : (
          <View style={styles.entries}>
            {entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                activeOpacity={0.8}
                onLongPress={() => handleDelete(entry)}
              >
                <View style={styles.entryIcon}>
                  <Ionicons
                    name={entry.type === 'photo' ? 'image-outline' : entry.type === 'unsent' ? 'mail-outline' : 'book-outline'}
                    size={18}
                    color="#7EC8E3"
                  />
                </View>
                <View style={styles.entryBody}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
                  <Text style={styles.entryContent} numberOfLines={2}>{entry.content}</Text>
                  <Text style={styles.entryDate}>
                    {entry.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  lockGradient: { flex: 1, overflow: 'hidden' },
  lockInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 24,
  },
  lockIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(126,200,227,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  lockTitle: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', color: '#fff' },
  lockSubtitle: { fontSize: 15, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.6)' },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  backBtn: { padding: 8 },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold', color: '#fff' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(126,200,227,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  subheading: {
    fontSize: 13, fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.4)', marginBottom: 24,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', color: 'rgba(255,255,255,0.6)' },
  emptyText: { fontSize: 14, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 24 },
  entries: { gap: 12 },
  entryCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(126,200,227,0.15)',
  },
  entryIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(126,200,227,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  entryBody: { flex: 1, gap: 4 },
  entryTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#fff' },
  entryContent: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.5)' },
  entryDate: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.3)', marginTop: 4 },
});
