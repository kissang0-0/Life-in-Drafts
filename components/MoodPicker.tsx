import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MOOD_OPTIONS } from '@/constants/nimbus';

type Props = {
  selected: string;
  onSelect: (mood: string) => void;
};

export function MoodPicker({ selected, onSelect }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {MOOD_OPTIONS.map((mood) => {
        const isSelected = selected === mood.key;
        const moodColor = colors.moodColors[mood.key] ?? colors.surfaceAlt;
        return (
          <TouchableOpacity
            key={mood.key}
            onPress={() => onSelect(isSelected ? '' : mood.key)}
            style={[
              styles.item,
              {
                backgroundColor: isSelected ? moodColor : colors.surfaceAlt,
                borderColor: isSelected ? colors.navy + '40' : 'transparent',
                borderWidth: isSelected ? 2 : 0,
                transform: [{ scale: isSelected ? 1.08 : 1 }],
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.navy : colors.textMuted },
              ]}
            >
              {mood.label}
            </Text>
            {isSelected && (
              <View style={[styles.selectedDot, { backgroundColor: colors.navy + '60' }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    minWidth: 72,
    position: 'relative',
  },
  emoji: {
    fontSize: 26,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  selectedDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
