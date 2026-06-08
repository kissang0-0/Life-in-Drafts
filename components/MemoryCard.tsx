import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Memory } from '@/lib/firestore';

type Props = {
  memory: Memory;
  onPress: () => void;
  width?: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export function MemoryCard({ memory, onPress, width = CARD_WIDTH }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.polaroid,
        {
          width,
          backgroundColor: memory.frameColor || '#FFFFFF',
          shadowColor: colors.shadowDeep,
        },
      ]}
    >
      <View style={styles.photoContainer}>
        {memory.photo ? (
          <Image source={{ uri: memory.photo }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={styles.placeholderIcon}>📷</Text>
          </View>
        )}
      </View>
      <View style={styles.captionContainer}>
        <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
          {memory.caption}
        </Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{memory.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  polaroid: {
    borderRadius: 4,
    padding: 8,
    paddingBottom: 12,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  photoContainer: {
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  placeholderIcon: {
    fontSize: 32,
  },
  captionContainer: {
    paddingHorizontal: 4,
    gap: 2,
  },
  caption: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 16,
    textAlign: 'center',
  },
  date: {
    fontSize: 10,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
});
