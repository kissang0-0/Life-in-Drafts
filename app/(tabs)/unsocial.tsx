import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function UnsocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.inner, { paddingTop: topPad + 40 }]}>
        <Text style={styles.emoji}>🪐</Text>
        <Text style={[styles.title, { color: colors.navy }]}>Unsocial Me-dia</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Coming soon — your personal, offline social space.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 22 },
});
