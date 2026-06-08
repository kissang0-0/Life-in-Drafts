import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Props = {
  value: string;
  length: number;
  onChange: (val: string) => void;
  onBiometric?: () => void;
  showBiometric?: boolean;
  error?: string;
};

const KEYS = ['1','2','3','4','5','6','7','8','9','bio','0','del'];

export default function PINPad({ value, length, onChange, onBiometric, showBiometric, error }: Props) {
  const colors = useColors();

  const handleKey = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (key === 'bio') {
      onBiometric?.();
    } else {
      if (value.length < length) onChange(value + key);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < value.length
                  ? colors.navy
                  : 'transparent',
                borderColor: error
                  ? colors.error
                  : i < value.length ? colors.navy : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      <View style={styles.grid}>
        {KEYS.map((key) => {
          if (key === 'bio') {
            return (
              <TouchableOpacity
                key={key}
                style={[styles.key, styles.keySpecial]}
                onPress={() => showBiometric ? handleKey('bio') : undefined}
                activeOpacity={showBiometric ? 0.7 : 1}
              >
                {showBiometric ? (
                  <Ionicons name="finger-print" size={26} color={colors.primary} />
                ) : (
                  <View />
                )}
              </TouchableOpacity>
            );
          }
          if (key === 'del') {
            return (
              <TouchableOpacity
                key={key}
                style={[styles.key, styles.keySpecial]}
                onPress={() => handleKey('del')}
                activeOpacity={0.7}
              >
                <Ionicons name="backspace-outline" size={24} color={colors.navy} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={key}
              style={[styles.key, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
              onPress={() => handleKey(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.keyText, { color: colors.navy }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 24 },
  dots: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  error: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: -12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: 260,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS !== 'web' ? {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    } : {}),
  },
  keySpecial: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 22,
    fontFamily: 'Nunito_700Bold',
  },
});
