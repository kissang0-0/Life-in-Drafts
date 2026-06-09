import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { DiaryEntry } from '@/lib/firestore';
import { MOOD_OPTIONS, ENTRY_TYPES } from '@/constants/nimbus';
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
  const entryType = entry.entryType ? ENTRY_TYPES.find((t) => t.key === entry.entryType) : null;
  const hasTitle = !!entry.title;
  const hasPhotos = entry.photos && entry.photos.length > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
    >
      {/* Top accent strip */}
      <View style={[styles.topStrip, { backgroundColor: moodColor }]}>
        <View style={styles.stripRow}>
          <View style={styles.stripLeft}>
            {mood && (
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            )}
            <Text style={[styles.date, { color: colors.navy + 'CC' }]}>
              {format(entry.createdAt)}
            </Text>
          </View>
          <View style={styles.stripRight}>
            {entryType && (
              <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
                <Text style={styles.typeEmoji}>{entryType.emoji}</Text>
                <Text style={[styles.typeLabel, { color: colors.navy }]}>{entryType.label}</Text>
              </View>
            )}
            {entry.isFavorite && (
              <Ionicons name="star" size={14} color={colors.navy + 'CC'} />
            )}
          </View>
        </View>
      </View>

      {/* Photo strip if has images */}
      {hasPhotos && (
        <View style={styles.photoStrip}>
          {entry.photos.slice(0, 3).map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={[
                styles.photoThumb,
                entry.photos.length === 1 && styles.photoThumbFull,
              ]}
              resizeMode="cover"
            />
          ))}
          {entry.photos.length > 3 && (
            <View style={[styles.photoMore, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.photoMoreText, { color: colors.textMuted }]}>+{entry.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}

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
  stripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodEmoji: {
    fontSize: 16,
  },
  date: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.3,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeEmoji: {
    fontSize: 11,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
  },
  photoStrip: {
    flexDirection: 'row',
    height: 90,
    gap: 2,
  },
  photoThumb: {
    flex: 1,
    height: 90,
  },
  photoThumbFull: {
    flex: 1,
  },
  photoMore: {
    width: 50,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMoreText: {
    fontSize: 13,
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
