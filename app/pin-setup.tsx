import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSecurityStore } from '@/store/securityStore';
import { savePIN, saveVaultPIN } from '@/lib/security';
import PINPad from '@/components/PINPad';
import NimbusBird from '@/components/NimbusBird';

type Step = 'choose-length' | 'enter' | 'confirm';

const LENGTH_OPTIONS = [
  { label: '4 digits', value: 4, desc: 'Quick & simple' },
  { label: '6 digits', value: 6, desc: 'Balanced security' },
  { label: '8 digits', value: 8, desc: 'Maximum security' },
];

type Props = {
  onDone?: () => void;
  isVault?: boolean;
};

export default function PINSetupScreen({ onDone, isVault = false }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setHasPIN, setPINLength } = useSecurityStore();

  const [step, setStep] = useState<Step>('choose-length');
  const [pinLength, setPinLengthLocal] = useState(4);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const topPad = Platform.OS === 'web' ? 40 : insets.top;

  const handleLengthSelect = (len: number) => {
    setPinLengthLocal(len);
    setStep('enter');
  };

  const handlePINChange = (val: string) => {
    setPin(val);
    setError('');
    if (val.length === pinLength) {
      setTimeout(() => setStep('confirm'), 200);
    }
  };

  const handleConfirmChange = async (val: string) => {
    setConfirmPin(val);
    setError('');
    if (val.length === pinLength) {
      if (val === pin) {
        if (isVault) {
          await saveVaultPIN(pin);
        } else {
          await savePIN(pin);
          setHasPIN(true);
          setPINLength(pinLength);
        }
        onDone ? onDone() : router.back();
      } else {
        setError("PINs don't match. Try again.");
        setConfirmPin('');
        setTimeout(() => setError(''), 2500);
      }
    }
  };

  const goBack = () => {
    if (step === 'confirm') { setStep('enter'); setConfirmPin(''); setError(''); }
    else if (step === 'enter') { setStep('choose-length'); setPin(''); }
    else { onDone ? onDone() : router.back(); }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surfaceAlt, '#E0EFFD']}
      style={[styles.gradient, { paddingTop: topPad }]}
    >
      <View style={[styles.blob1, { backgroundColor: colors.primary + '30' }]} />
      <View style={[styles.blob2, { backgroundColor: colors.lavender + '40' }]} />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
      </View>

      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: '#D6F0FB' }]}>
            {isVault
              ? <Ionicons name="lock-closed" size={32} color={colors.navy} />
              : <NimbusBird size={48} />}
          </View>
          <Text style={[styles.title, { color: colors.navy }]}>
            {isVault ? 'Vault PIN' : 'Create Your PIN'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {step === 'choose-length' && 'Choose your PIN length'}
            {step === 'enter' && `Enter your ${pinLength}-digit PIN`}
            {step === 'confirm' && 'Confirm your PIN'}
          </Text>
        </View>

        {step === 'choose-length' && (
          <View style={styles.options}>
            {LENGTH_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
                onPress={() => handleLengthSelect(opt.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionDots]}>
                  {Array.from({ length: opt.value }).map((_, i) => (
                    <View key={i} style={[styles.optionDot, { backgroundColor: colors.primary }]} />
                  ))}
                </View>
                <Text style={[styles.optionLabel, { color: colors.navy }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 'enter' && (
          <PINPad
            value={pin}
            length={pinLength}
            onChange={handlePINChange}
            error={error}
          />
        )}

        {step === 'confirm' && (
          <PINPad
            value={confirmPin}
            length={pinLength}
            onChange={handleConfirmChange}
            error={error}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, overflow: 'hidden' },
  blob1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -80, right: -80 },
  blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 60, left: -70 },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  backBtn: { padding: 8, alignSelf: 'flex-start' },
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
  title: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.3 },
  subtitle: { fontSize: 15, fontFamily: 'Nunito_400Regular' },
  options: { gap: 12, width: '100%' },
  optionCard: {
    borderRadius: 20, padding: 20, alignItems: 'center', gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  optionDots: { flexDirection: 'row', gap: 6 },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  optionDesc: { fontSize: 13, fontFamily: 'Nunito_400Regular' },
});
