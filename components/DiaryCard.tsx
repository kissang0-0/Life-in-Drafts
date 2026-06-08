import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  const moodColor = entry.mood ? colors.moodColors[entry.mood] ?? colors.surfaceAlt : colors.primary + '30';
  const hasTitle = !!entry.title;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
    >
      {/* Top accent strip */}
      <View style={[styles.topStrip, { backgroundColor: moodColor }]}>
        <View style={styles.stripRow}>
          <Text style={[styles.date, { color: colors.navy + 'CC' }]}>
            {format(entry.createdAt)}
          </Text>
          {mood && (
            <View style={[styles.moodPill, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
              <Ionicons name={mood.icon} size={13} color={colors.navy} />
              <Text style={[styles.moodLabel, { color: colors.navy }]}>{mood.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {hasTitle && (
          <Text style={[styles.title, { color: colors.navy }]} numberOfLines={1}>
            {entry.title}
          </Text>
        )}
        <Text
          style={[styles.preview, { color: colors.textMuted }]}
          numberOfLines={hasTitle ? 2 : 3}
        >
          {entry.content}
        </Text>

        {entry.tags.length > 0 && (
          <View style={styles.tags}>
            {entry.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.tagText, { color: colors.primaryDark }]}>#{tag}</Text>
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
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
  },
  topStrip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.3,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  moodLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  body: {
    padding: 14,
    paddingTop: 12,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
    lineHeight: 22,
  },
  preview: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 21,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
});
