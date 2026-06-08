import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColors } from '@/hooks/useColors';
import { useSecurityStore } from '@/store/securityStore';
import { verifyPIN, saveBiometricEnabled } from '@/lib/security';
import PINPad from '@/components/PINPad';
import NimbusBird from '@/components/NimbusBird';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onUnlock: () => void;
};

export default function LockScreen({ onUnlock }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pinLength, biometricEnabled, setBiometricEnabled } = useSecurityStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [checking, setChecking] = useState(false);

  const topPad = Platform.OS === 'web' ? 40 : insets.top;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then((has) => {
        setBioAvailable(has && biometricEnabled);
      });
    }
  }, [biometricEnabled]);

  const triggerBiometric = useCallback(async () => {
    if (Platform.OS === 'web' || !bioAvailable) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Life in Drafts',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        onUnlock();
      }
    } catch {}
  }, [bioAvailable, onUnlock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (bioAvailable) triggerBiometric();
    }, 400);
    return () => clearTimeout(timer);
  }, [bioAvailable, triggerBiometric]);

  useEffect(() => {
    if (pin.length === pinLength) {
      handlePINSubmit(pin);
    }
  }, [pin, pinLength]);

  const handlePINSubmit = async (entered: string) => {
    setChecking(true);
    const ok = await verifyPIN(entered);
    setChecking(false);
    if (ok) {
      onUnlock();
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
      setTimeout(() => setError(''), 2000);
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surfaceAlt, '#E0EFFD']}
      style={[styles.gradient, { paddingTop: topPad }]}
    >
      <View style={[styles.blob1, { backgroundColor: colors.primary + '30' }]} />
      <View style={[styles.blob2, { backgroundColor: colors.lavender + '40' }]} />

      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: '#D6F0FB' }]}>
            <NimbusBird size={52} />
          </View>
          <Text style={[styles.appName, { color: colors.navy }]}>Life in Drafts</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your archive is locked</Text>
        </View>

        {checking ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <PINPad
            value={pin}
            length={pinLength}
            onChange={setPin}
            onBiometric={triggerBiometric}
            showBiometric={bioAvailable && Platform.OS !== 'web'}
            error={error}
          />
        )}

        <Text style={[styles.hint, { color: colors.textLight }]}>
          {bioAvailable && Platform.OS !== 'web'
            ? 'Use biometrics or enter your PIN'
            : 'Enter your PIN to continue'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, overflow: 'hidden' },
  blob1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -80, right: -80 },
  blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 60, left: -70 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 36,
  },
  brand: { alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  appName: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Nunito_400Regular' },
  hint: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
});
