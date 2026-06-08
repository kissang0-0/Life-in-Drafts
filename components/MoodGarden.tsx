import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { DiaryEntry } from '@/lib/firestore';
import { MOOD_FLOWERS } from '@/constants/quotes';

type Props = {
  entries: DiaryEntry[];
  onPress?: () => void;
};

export function MoodGarden({ entries, onPress }: Props) {
  const colors = useColors();

  const recent = entries
    .filter((e) => e.mood && MOOD_FLOWERS[e.mood])
    .slice(0, 30);

  if (recent.length === 0) return null;

  const moodCounts: Record<string, number> = {};
  for (const e of recent) {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
  }

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const dominantFlower = dominantMood ? MOOD_FLOWERS[dominantMood] : null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.navy }]}>Mood Garden</Text>
        {dominantFlower && (
          <Text style={[styles.dominant, { color: colors.textMuted }]}>
            Mostly {dominantFlower.name} lately
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gardenRow}
      >
        {recent.map((entry, i) => {
          const flower = MOOD_FLOWERS[entry.mood];
          if (!flower) return null;
          const size = 28 + (i % 3) * 6;
          return (
            <View
              key={entry.id}
              style={[
                styles.flower,
                {
                  marginTop: i % 2 === 0 ? 0 : 10,
                  opacity: 0.7 + (i / recent.length) * 0.3,
                },
              ]}
            >
              <Text style={{ fontSize: size }}>{flower.emoji}</Text>
            </View>
          );
        })}
      </ScrollView>

      <Text style={[styles.hint, { color: colors.textLight }]}>
        {recent.length} flower{recent.length !== 1 ? 's' : ''} in your garden
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20, padding: 16, gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  dominant: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  gardenRow: { gap: 4, alignItems: 'flex-end', paddingVertical: 4, minHeight: 60 },
  flower: { paddingHorizontal: 2 },
  hint: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
});
