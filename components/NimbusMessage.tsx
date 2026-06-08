import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { NIMBUS_MESSAGES } from '@/constants/nimbus';
import NimbusBird from '@/components/NimbusBird';

type Props = {
  message?: string;
  style?: object;
};

export function NimbusMessage({ message, style }: Props) {
  const colors = useColors();
  const randomMessage = useMemo(
    () => NIMBUS_MESSAGES[Math.floor(Math.random() * NIMBUS_MESSAGES.length)],
    []
  );
  const displayMessage = message ?? randomMessage;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, style]}>
      <View style={styles.birdWrap}>
        <NimbusBird size={50} />
      </View>
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
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  birdWrap: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
});
