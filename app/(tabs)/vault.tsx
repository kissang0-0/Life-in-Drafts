import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Animated, Platform, Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import {
  hasVaultPINSet, verifyVaultPIN, saveVaultPIN,
} from '@/lib/security';

const { width: SW } = Dimensions.get('window');

// ─── Floating particle ─────────────────────────────────────────────────────

function Particle({ x, delay }: { x: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(opAnim, { toValue: 0, duration: 800, useNativeDriver: true, delay: 2400 }),
          ]),
        ]),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
  return (
    <Animated.View
      style={[
        styles.particle,
        { left: x, opacity: opAnim, transform: [{ translateY }] },
      ]}
    />
  );
}

// ─── PIN Pad ───────────────────────────────────────────────────────────────

type PINPadProps = {
  mode: 'verify' | 'create' | 'confirm';
  title: string;
  subtitle: string;
  onSuccess: (pin: string) => void;
  onCancel?: () => void;
  error?: string;
};

function PINPad({ mode, title, subtitle, onSuccess, onCancel, error }: PINPadProps) {
  const colors = useColors();
  const [entered, setEntered] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const press = useCallback((digit: string) => {
    const next = entered + digit;
    if (next.length > 6) return;
    setEntered(next);
    if (next.length === 4) {
      setTimeout(() => {
        onSuccess(next);
        setEntered('');
      }, 120);
    }
  }, [entered, onSuccess]);

  const del = useCallback(() => setEntered((p) => p.slice(0, -1)), []);

  const dots = Array.from({ length: 4 }, (_, i) => i < entered.length);

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1A1F3A', '#0D1B2A']}
      style={styles.pinOverlay}
    >
      {/* Particles */}
      {[40, 100, 180, 260, SW - 60, SW - 120].map((x, i) => (
        <Particle key={i} x={x} delay={i * 600} />
      ))}

      {/* Moon glow */}
      <View style={styles.moonGlow} />

      <View style={styles.pinContent}>
        {/* Logo */}
        <View style={styles.pinBirdWrap}>
          <NimbusBird size={72} />
        </View>

        <Text style={styles.pinTitle}>{title}</Text>
        <Text style={styles.pinSubtitle}>{subtitle}</Text>

        {/* Dot row */}
        <Animated.View style={[styles.dotRow, { transform: [{ translateX: shakeAnim }] }]}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                filled ? styles.dotFilled : styles.dotEmpty,
              ]}
            />
          ))}
        </Animated.View>

        {error ? (
          <Text style={styles.pinError}>{error}</Text>
        ) : null}

        {/* Numpad */}
        <View style={styles.numpad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => k === '⌫' ? del() : k ? press(k) : undefined}
              activeOpacity={0.7}
              style={[styles.numKey, !k && styles.numKeyEmpty]}
              disabled={!k && k !== '0'}
            >
              {k ? (
                <Text style={styles.numKeyText}>{k}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.pinCancel}>
            <Text style={styles.pinCancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

// ─── Vault Category Card ───────────────────────────────────────────────────

type Category = {
  icon: string;
  label: string;
  subtitle: string;
  color: string;
  glow: string;
  emoji: string;
};

const CATEGORIES: Category[] = [
  { icon: 'book',         label: 'Hidden Diary',      subtitle: 'Private entries',         color: '#C9AEED', glow: '#C9AEED30', emoji: '📖' },
  { icon: 'mail',         label: 'Hidden Messages',   subtitle: 'Unsent & secret',         color: '#7EC8E3', glow: '#7EC8E330', emoji: '💬' },
  { icon: 'images',       label: 'Hidden Photos',     subtitle: 'Private gallery',         color: '#FFB6C1', glow: '#FFB6C130', emoji: '📸' },
  { icon: 'document-text', label: 'Private Notes',    subtitle: 'Secure thoughts',         color: '#98D4A3', glow: '#98D4A330', emoji: '📝' },
  { icon: 'time',         label: 'Time Capsules',     subtitle: 'Sealed until ready',      color: '#FFCA6B', glow: '#FFCA6B30', emoji: '⏳' },
  { icon: 'mic',          label: 'Voice Vault',       subtitle: 'Private recordings',      color: '#F4A261', glow: '#F4A26130', emoji: '🎙' },
  { icon: 'star',         label: 'Deep Reflections',  subtitle: 'Your inner world',        color: '#DEC8F8', glow: '#DEC8F830', emoji: '⭐' },
  { icon: 'file-tray-full', label: 'Hidden Files',   subtitle: 'Secure storage',          color: '#90CAF9', glow: '#90CAF930', emoji: '📁' },
];

// ─── Main Vault Screen ─────────────────────────────────────────────────────

type VaultPhase =
  | 'locked'        // show PIN pad to enter
  | 'setup-create'  // first time — create a PIN
  | 'setup-confirm' // confirm the new PIN
  | 'open';         // vault is unlocked

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [phase, setPhase] = useState<VaultPhase>('locked');
  const [pinError, setPinError] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // floating star animations
  const starAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    hasVaultPINSet().then(setHasPin);
  }, []);

  useEffect(() => {
    if (phase !== 'open') return;
    const loops = starAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(anim, { toValue: 1, duration: 1800 + i * 200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1800 + i * 200, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [phase]);

  // Determine initial phase once we know if PIN exists
  useEffect(() => {
    if (hasPin === null) return;
    setPhase(hasPin ? 'locked' : 'setup-create');
  }, [hasPin]);

  const handleVerify = useCallback(async (pin: string) => {
    const ok = await verifyVaultPIN(pin);
    if (ok) {
      setPinError('');
      setPhase('open');
    } else {
      setPinError('Wrong PIN. Try again.');
    }
  }, []);

  const handleCreate = useCallback((pin: string) => {
    setSetupPin(pin);
    setPhase('setup-confirm');
  }, []);

  const handleConfirm = useCallback(async (pin: string) => {
    if (pin !== setupPin) {
      setPinError("PINs don't match. Start again.");
      setSetupPin('');
      setPhase('setup-create');
      return;
    }
    await saveVaultPIN(pin);
    setHasPin(true);
    setPinError('');
    setPhase('open');
  }, [setupPin]);

  const emergencyLock = useCallback(() => {
    setPhase('locked');
    setSelectedCategory(null);
  }, []);

  // ── Loading ──
  if (hasPin === null) {
    return (
      <LinearGradient colors={['#0D1B2A', '#1A1F3A']} style={styles.loadWrap}>
        <NimbusBird size={60} />
      </LinearGradient>
    );
  }

  // ── PIN phases ──
  if (phase === 'locked') {
    return (
      <PINPad
        mode="verify"
        title="Secret Vault"
        subtitle="Enter your vault PIN to continue"
        onSuccess={handleVerify}
        error={pinError}
      />
    );
  }

  if (phase === 'setup-create') {
    return (
      <PINPad
        mode="create"
        title="Create Vault PIN"
        subtitle="Choose a 4-digit PIN for your secret vault"
        onSuccess={handleCreate}
        error={pinError}
      />
    );
  }

  if (phase === 'setup-confirm') {
    return (
      <PINPad
        mode="confirm"
        title="Confirm Vault PIN"
        subtitle="Enter the same PIN again to confirm"
        onSuccess={handleConfirm}
        error={pinError}
        onCancel={() => { setSetupPin(''); setPhase('setup-create'); }}
      />
    );
  }

  // ── Category detail (placeholder) ──
  if (selectedCategory) {
    return (
      <LinearGradient colors={['#0D1B2A', '#1A1F3A', '#0D1B2A']} style={{ flex: 1 }}>
        <View style={[styles.catHeader, { paddingTop: topPad + 10 }]}>
          <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#E8E8F8" />
          </TouchableOpacity>
          <Text style={styles.catHeaderTitle}>{selectedCategory.emoji} {selectedCategory.label}</Text>
          <TouchableOpacity onPress={emergencyLock} style={styles.lockBtn}>
            <Ionicons name="lock-closed" size={18} color="#E8E8F8" />
          </TouchableOpacity>
        </View>

        <View style={styles.catEmptyWrap}>
          <Text style={styles.catEmptyEmoji}>{selectedCategory.emoji}</Text>
          <Text style={styles.catEmptyTitle}>Nothing here yet</Text>
          <Text style={styles.catEmptyText}>
            This is your private space for {selectedCategory.label.toLowerCase()}.{'\n'}
            Only you can see what's here.
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[styles.catEmptyBtn, { backgroundColor: selectedCategory.color + '30', borderColor: selectedCategory.color + '60' }]}
          >
            <Text style={[styles.catEmptyBtnText, { color: selectedCategory.color }]}>← Back to Vault</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Vault open ──
  const starPositions = [
    { top: 80, left: 40 },
    { top: 140, right: 60 },
    { top: 220, left: 120 },
    { top: 60, right: 100 },
    { top: 300, left: 20 },
    { top: 180, right: 20 },
  ];

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1A1F3A', '#111830']}
      style={{ flex: 1 }}
    >
      {/* Floating stars */}
      {starAnims.map((anim, i) => {
        const pos = starPositions[i];
        const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.9, 0.2] });
        return (
          <Animated.Text key={i} style={[styles.floatStar, pos, { opacity }]}>✦</Animated.Text>
        );
      })}

      <ScrollView
        contentContainerStyle={[
          styles.vaultScroll,
          { paddingTop: topPad + 12, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.vaultHeader}>
          <View>
            <Text style={styles.vaultEyebrow}>✦ THE ARCHIVE OF BECOMING</Text>
            <Text style={styles.vaultTitle}>Secret Vault</Text>
            <Text style={styles.vaultSubtitle}>Your hidden sanctuary</Text>
          </View>
          <TouchableOpacity onPress={emergencyLock} style={styles.emergencyBtn} activeOpacity={0.8}>
            <Ionicons name="lock-closed" size={16} color="#E8E8F8" />
          </TouchableOpacity>
        </View>

        {/* Nimbus message */}
        <View style={styles.nimbusCard}>
          <NimbusBird size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nimbusCardName}>✦ Nimbus</Text>
            <Text style={styles.nimbusCardMsg}>
              Some things deserve extra protection. This space belongs only to you.
            </Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionLabel}>Your Hidden Rooms</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
              style={[styles.catCard, { borderColor: cat.color + '40', backgroundColor: cat.glow }]}
            >
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + '25' }]}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
              <Text style={styles.catSub}>{cat.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Future Letters teaser */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.futureCard}
        >
          <LinearGradient
            colors={['#2A1A3A', '#1A2A3A']}
            style={styles.futureGrad}
          >
            <Text style={styles.futureEmoji}>💌</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.futureTitle}>Future Letters</Text>
              <Text style={styles.futureSub}>Write to your future self — sealed until you're ready</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#DEC8F8" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Time Capsule teaser */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.futureCard}
        >
          <LinearGradient
            colors={['#1A2A1A', '#0D1B2A']}
            style={styles.futureGrad}
          >
            <Text style={styles.futureEmoji}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.futureTitle}>Time Capsule Room</Text>
              <Text style={styles.futureSub}>Lock memories away to open in 1 month, 1 year, or beyond</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#98D4A3" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Lock reminder */}
        <View style={styles.lockReminder}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#6E92AB" />
          <Text style={styles.lockReminderText}>
            Tap the lock icon anytime to seal the vault immediately
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Particle
  particle: {
    position: 'absolute',
    bottom: 60,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DEC8F8',
  },

  // Moon glow
  moonGlow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#4A3A7A20',
  },

  // PIN pad
  pinOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pinContent: { width: '100%', alignItems: 'center', paddingHorizontal: 32 },
  pinBirdWrap: { marginBottom: 16 },
  pinTitle: {
    color: '#E8E8F8', fontSize: 22, fontFamily: 'Nunito_800ExtraBold',
    marginBottom: 6, textAlign: 'center',
  },
  pinSubtitle: {
    color: '#8A9AB8', fontSize: 13, fontFamily: 'Nunito_400Regular',
    marginBottom: 28, textAlign: 'center',
  },
  dotRow: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotFilled: { backgroundColor: '#DEC8F8' },
  dotEmpty: { backgroundColor: '#FFFFFF20', borderWidth: 1.5, borderColor: '#FFFFFF40' },
  pinError: {
    color: '#F4A2A2', fontSize: 13, fontFamily: 'Nunito_600SemiBold',
    marginBottom: 8, textAlign: 'center',
  },
  numpad: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 14, marginTop: 20, maxWidth: 280,
  },
  numKey: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFFFF12',
    borderWidth: 1, borderColor: '#FFFFFF18',
    alignItems: 'center', justifyContent: 'center',
  },
  numKeyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  numKeyText: { color: '#E8E8F8', fontSize: 22, fontFamily: 'Nunito_700Bold' },
  pinCancel: { marginTop: 20, padding: 10 },
  pinCancelText: { color: '#6E92AB', fontSize: 14, fontFamily: 'Nunito_600SemiBold' },

  // Vault open
  vaultScroll: { paddingHorizontal: 18, gap: 16 },

  vaultHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  vaultEyebrow: {
    color: '#6E8AB0', fontSize: 9, fontFamily: 'Nunito_700Bold',
    letterSpacing: 2, marginBottom: 4,
  },
  vaultTitle: { color: '#E8E8F8', fontSize: 26, fontFamily: 'Nunito_800ExtraBold' },
  vaultSubtitle: { color: '#8A9AB8', fontSize: 13, fontFamily: 'Nunito_400Regular' },
  emergencyBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF15',
    borderWidth: 1, borderColor: '#FFFFFF25',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 6,
  },

  // Nimbus card
  nimbusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF08',
    borderWidth: 1, borderColor: '#DEC8F820',
    borderRadius: 20, padding: 14,
  },
  nimbusCardName: {
    color: '#DEC8F8', fontSize: 10, fontFamily: 'Nunito_700Bold',
    letterSpacing: 1, marginBottom: 4,
  },
  nimbusCardMsg: {
    color: '#B0C0D8', fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 19,
  },

  // Section label
  sectionLabel: {
    color: '#8A9AB8', fontSize: 11, fontFamily: 'Nunito_700Bold',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: (SW - 48) / 2,
    borderRadius: 20, borderWidth: 1,
    padding: 16, gap: 8,
    alignItems: 'flex-start',
  },
  catIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  catSub: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: '#7A8A9A' },

  // Future cards
  futureCard: { borderRadius: 20, overflow: 'hidden' },
  futureGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderWidth: 1, borderColor: '#FFFFFF15', borderRadius: 20,
  },
  futureEmoji: { fontSize: 28 },
  futureTitle: { color: '#E8E8F8', fontSize: 15, fontFamily: 'Nunito_700Bold', marginBottom: 3 },
  futureSub: { color: '#7A8A9A', fontSize: 12, fontFamily: 'Nunito_400Regular', lineHeight: 17 },

  // Lock reminder
  lockReminder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8,
  },
  lockReminderText: {
    color: '#4A6A85', fontSize: 12, fontFamily: 'Nunito_400Regular', flex: 1,
  },

  // Float stars
  floatStar: { position: 'absolute', fontSize: 12, color: '#DEC8F8' },

  // Category detail
  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center',
  },
  catHeaderTitle: { color: '#E8E8F8', fontSize: 17, fontFamily: 'Nunito_700Bold', flex: 1, textAlign: 'center' },
  lockBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center',
  },
  catEmptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 12,
  },
  catEmptyEmoji: { fontSize: 52 },
  catEmptyTitle: { color: '#E8E8F8', fontSize: 20, fontFamily: 'Nunito_700Bold' },
  catEmptyText: {
    color: '#7A8A9A', fontSize: 14, fontFamily: 'Nunito_400Regular',
    textAlign: 'center', lineHeight: 21,
  },
  catEmptyBtn: {
    marginTop: 8, paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: 20, borderWidth: 1,
  },
  catEmptyBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
});
