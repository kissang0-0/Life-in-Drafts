import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';

type Props = {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  nimbus?: boolean;
};

export function EmptyState({ icon, title, subtitle, nimbus }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {nimbus ? (
        <>
          <NimbusBird size={96} />
          <Text style={[styles.nimbusLabel, { color: colors.primary }]}>✦ Nimbus</Text>
        </>
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name={icon} size={32} color={colors.textLight} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textLight }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  nimbusLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
});
