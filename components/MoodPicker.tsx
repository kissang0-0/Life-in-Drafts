import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
            onPress={() => onSelect(mood.key)}
            style={[
              styles.item,
              {
                backgroundColor: isSelected ? moodColor : colors.surfaceAlt,
                borderColor: isSelected ? colors.navy : 'transparent',
                borderWidth: isSelected ? 1.5 : 0,
              },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={mood.icon}
              size={18}
              color={isSelected ? colors.navy : colors.textMuted}
            />
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.navy : colors.textMuted },
              ]}
            >
              {mood.label}
            </Text>
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
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    minWidth: 68,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
});
