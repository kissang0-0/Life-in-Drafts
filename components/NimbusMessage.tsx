import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { NIMBUS_MESSAGES, NIMBUS_MOOD_MESSAGES } from '@/constants/nimbus';
import NimbusBird from '@/components/NimbusBird';

type Props = {
  message?: string;
  mood?: string;
  style?: object;
};

export function NimbusMessage({ message, mood, style }: Props) {
  const colors = useColors();

  const moodMessage = useMemo(() => {
    if (mood && NIMBUS_MOOD_MESSAGES[mood]) {
      const msgs = NIMBUS_MOOD_MESSAGES[mood];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
    return null;
  }, [mood]);

  const randomMessage = useMemo(
    () => NIMBUS_MESSAGES[Math.floor(Math.random() * NIMBUS_MESSAGES.length)],
    []
  );

  const displayMessage = message ?? moodMessage ?? randomMessage;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, style]}>
      <NimbusBird size={68} />
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
    padding: 12,
    gap: 10,
  },
  bubble: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 20,
  },
});
