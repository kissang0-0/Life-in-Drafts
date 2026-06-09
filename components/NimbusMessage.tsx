import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { getDailyNimbusMessage } from '@/constants/nimbusMessages';
import NimbusBird from '@/components/NimbusBird';

type Props = {
  message?: string;
  mood?: string;
  style?: object;
  size?: number;
};

export function NimbusMessage({ message, mood, style, size = 72 }: Props) {
  const colors = useColors();
  const displayMessage = message ?? getDailyNimbusMessage(mood);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, style]}>
      <NimbusBird size={size} />
      <View style={styles.bubble}>
        <Text style={[styles.name, { color: colors.primary }]}>Nimbus</Text>
        <Text style={[styles.message, { color: colors.text }]}>{displayMessage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  bubble: { flex: 1, gap: 4 },
  name: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  message: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 21 },
});
