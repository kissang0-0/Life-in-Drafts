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
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)/home');
    }
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    clearError();

    if (mode === 'signin') {
      await signIn(email.trim(), password);
    } else {
      await signUp(email.trim(), password);
      const currentError = useAuthStore.getState().error;
      if (!currentError) {
        showToast('🎉 Archive created! Welcome to Life in Drafts.', 'success');
      }
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surfaceAlt, '#E0EFFD']}
      style={styles.gradient}
    >
      {/* Decorative blobs */}
      <View style={[styles.blob1, { backgroundColor: colors.primary + '30' }]} />
      <View style={[styles.blob2, { backgroundColor: colors.lavender + '40' }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: '#D6F0FB' }]}>
              <NimbusBird size={56} />
            </View>
            <Text style={[styles.appName, { color: colors.navy }]}>Life in Drafts</Text>
            <Text style={[styles.tagline, { color: colors.textMuted }]}>The Archive of Becoming</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={[styles.heading, { color: colors.navy }]}>
              {mode === 'signin' ? 'Welcome back' : 'Create your archive'}
            </Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>
              {mode === 'signin'
                ? 'Your private world is waiting.'
                : 'Your journey begins here.'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fields}>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
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
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {mode === 'signin' ? 'Open my archive' : 'Begin my journey'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); clearError(); }}
              style={styles.switchBtn}
            >
              <Text style={[styles.switchText, { color: colors.textMuted }]}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: colors.primary, fontFamily: 'Nunito_700Bold' }}>
                  {mode === 'signin' ? 'Create one' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
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
    position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -80, right: -80,
  },
  blob2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 60, left: -70,
  },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  brand: { alignItems: 'center', marginBottom: 36, gap: 8 },
  logoCircle: {
    width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  appName: { fontSize: 28, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.5 },
  tagline: { fontSize: 14, fontFamily: 'Nunito_400Regular', letterSpacing: 0.3 },
  card: {
    borderRadius: 28, padding: 28, gap: 16,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 8,
  },
  heading: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center' },
  subheading: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12,
    backgroundColor: '#FDECEA', borderColor: '#F28B82', borderWidth: 1.5,
  },
  errorText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', flex: 1, color: '#B71C1C' },
  fields: { gap: 12 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  btn: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  switchBtn: { alignItems: 'center', marginTop: 4 },
  switchText: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
});
