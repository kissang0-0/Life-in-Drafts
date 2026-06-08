import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import Toast from '@/components/Toast';
import { AnimatedButton } from '@/components/AnimatedButton';

const SPARKLES = ['✨', '⭐', '💫', '🌟', '✦'];

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, loading, error, clearError, user } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false, message: '', type: 'success',
  });

  useEffect(() => {
    if (user) router.replace('/(tabs)/home');
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleSubmit = async () => {
    if (!email.trim()) { Alert.alert('Missing email', 'Please enter your email address.'); return; }
    if (!password.trim()) { Alert.alert('Missing password', 'Please enter your password.'); return; }
    if (mode === 'signup' && password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
    clearError();
    if (mode === 'signin') {
      await signIn(email.trim(), password);
    } else {
      await signUp(email.trim(), password);
      const currentError = useAuthStore.getState().error;
      if (!currentError) showToast('🎉 Archive created! Welcome to Life in Drafts.', 'success');
    }
  };

  return (
    <LinearGradient
      colors={['#FBF0FF', '#EEE0FB', '#D8EEFF', '#E0F5FF']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.gradient}
    >
      {/* Decorative blobs */}
      <View style={[styles.blob1, { backgroundColor: '#F9C6FF' }]} />
      <View style={[styles.blob2, { backgroundColor: '#B8DEFF' }]} />
      <View style={[styles.blob3, { backgroundColor: '#FFD6F0' }]} />

      {/* Floating sparkles */}
      <Text style={[styles.sparkle, { top: '12%', left: '8%', fontSize: 22 }]}>✨</Text>
      <Text style={[styles.sparkle, { top: '8%', right: '12%', fontSize: 18 }]}>⭐</Text>
      <Text style={[styles.sparkle, { top: '20%', right: '6%', fontSize: 14 }]}>💫</Text>
      <Text style={[styles.sparkle, { bottom: '18%', left: '5%', fontSize: 16 }]}>🌟</Text>
      <Text style={[styles.sparkle, { bottom: '12%', right: '8%', fontSize: 20 }]}>✦</Text>
      <Text style={[styles.sparkle, { top: '40%', left: '4%', fontSize: 12 }]}>✦</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <NimbusBird size={130} />
            </View>
            <Text style={[styles.appName, { color: colors.navy }]}>Life in Drafts</Text>
            <View style={styles.taglineRow}>
              <Text style={styles.taglineEmoji}>📖</Text>
              <Text style={[styles.tagline, { color: colors.textMuted }]}>The Archive of Becoming</Text>
              <Text style={styles.taglineEmoji}>🌸</Text>
            </View>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.88)', shadowColor: '#C9AEED' }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.heading, { color: colors.navy }]}>
                {mode === 'signin' ? 'Welcome back! 💙' : 'Join the journey ✨'}
              </Text>
              <Text style={[styles.subheading, { color: colors.textMuted }]}>
                {mode === 'signin'
                  ? 'Your private world is waiting for you.'
                  : 'Create your personal journal archive.'}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fields}>
              <View style={[styles.inputWrap, { borderColor: '#E0D0F8', backgroundColor: '#FAF6FF' }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.inputWrap, { borderColor: '#E0D0F8', backgroundColor: '#FAF6FF' }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <AnimatedButton
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.btnGradient, { opacity: loading ? 0.75 : 1 }]}
            >
              <LinearGradient
                colors={['#B8A4E8', '#7EC8E3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {mode === 'signin' ? '✨ Open my archive' : '🌟 Begin my journey'}
                  </Text>
                )}
              </LinearGradient>
            </AnimatedButton>

            <TouchableOpacity
              onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); clearError(); }}
              style={styles.switchBtn}
            >
              <Text style={[styles.switchText, { color: colors.textMuted }]}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: '#B8A4E8', fontFamily: 'Nunito_700Bold' }}>
                  {mode === 'signin' ? 'Create one 🌸' : 'Sign in 💙'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom tagline */}
          <View style={styles.bottomNote}>
            <Text style={[styles.bottomText, { color: colors.textLight }]}>
              A safe, private space just for you 🔒
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, overflow: 'hidden' },
  blob1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    top: -100, right: -100, opacity: 0.45,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    bottom: 80, left: -80, opacity: 0.4,
  },
  blob3: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    top: '40%', right: -60, opacity: 0.35,
  },
  sparkle: {
    position: 'absolute',
    opacity: 0.7,
  },
  scroll: { paddingHorizontal: 24, flexGrow: 1, alignItems: 'stretch' },
  brand: { alignItems: 'center', marginBottom: 24, gap: 6 },
  logoWrap: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 30, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.5 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taglineEmoji: { fontSize: 14 },
  tagline: { fontSize: 13, fontFamily: 'Nunito_400Regular', letterSpacing: 0.3 },
  card: {
    borderRadius: 32, padding: 26, gap: 16,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 10,
    borderWidth: 1.5, borderColor: 'rgba(200,170,240,0.3)',
  },
  cardTop: { gap: 6, alignItems: 'center' },
  heading: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center' },
  subheading: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14,
    backgroundColor: '#FDECEA', borderColor: '#F28B82', borderWidth: 1.5,
  },
  errorText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', flex: 1, color: '#B71C1C' },
  fields: { gap: 12 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15 },
  btnGradient: { borderRadius: 18, overflow: 'hidden' },
  btn: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold', letterSpacing: 0.3 },
  switchBtn: { alignItems: 'center', paddingTop: 4 },
  switchText: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  bottomNote: { alignItems: 'center', marginTop: 20 },
  bottomText: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
});
