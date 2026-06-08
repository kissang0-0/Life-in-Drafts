import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { DiaryEntry } from '@/lib/firestore';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import { Ionicons } from '@expo/vector-icons';
import { format } from '@/lib/dateUtils';

type Props = {
  entry: DiaryEntry;
  onPress: () => void;
};

export function DiaryCard({ entry, onPress }: Props) {
  const colors = useColors();
  const mood = MOOD_OPTIONS.find((m) => m.key === entry.mood);
  const moodColor = entry.mood ? colors.moodColors[entry.mood] ?? colors.surfaceAlt : colors.surfaceAlt;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
    >
      <View style={[styles.moodBar, { backgroundColor: moodColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {format(entry.createdAt)}
          </Text>
          {mood && (
            <View style={[styles.moodBadge, { backgroundColor: moodColor }]}>
              <Ionicons name={mood.icon} size={12} color={colors.navy} />
              <Text style={[styles.moodLabel, { color: colors.navy }]}>{mood.label}</Text>
            </View>
          )}
        </View>
        {entry.title ? (
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {entry.title}
          </Text>
        ) : null}
        <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={3}>
          {entry.content}
        </Text>
        {entry.tags.length > 0 && (
          <View style={styles.tags}>
            {entry.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  moodBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  moodLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 22,
  },
  preview: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
});
