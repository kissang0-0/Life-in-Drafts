import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useColors } from '@/hooks/useColors';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, loading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    if (mode === 'signin') {
      await signIn(email.trim(), password);
    } else {
      await signUp(email.trim(), password);
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surfaceAlt, '#E0EFFD']}
      style={styles.gradient}
    >
      {/* Decorative elements */}
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
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoIcon}>🐦</Text>
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

            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

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
              style={[styles.btn, { backgroundColor: colors.primary }]}
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
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  logoIcon: { fontSize: 36 },
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
  },
  errorText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', flex: 1 },
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
