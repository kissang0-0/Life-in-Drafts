import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { DiaryEntry } from '@/lib/firestore';
import { MOOD_OPTIONS } from '@/constants/nimbus';

type Props = {
  entries: DiaryEntry[];
  onPress: (id: string) => void;
};

const PERIODS = [
  { label: '1 month ago',  months: 1 },
  { label: '6 months ago', months: 6 },
  { label: '1 year ago',   months: 12 },
];

function sameMonthDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
}

export function OnThisDay({ entries, onPress }: Props) {
  const colors = useColors();
  const now = new Date();

  const memories: { label: string; entry: DiaryEntry }[] = [];

  for (const period of PERIODS) {
    const target = new Date(now);
    target.setMonth(target.getMonth() - period.months);

    const match = entries.find((e) => sameMonthDay(e.createdAt, target));
    if (match) {
      memories.push({ label: period.label, entry: match });
    }
  }

  if (memories.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>On This Day</Text>
      </View>

      {memories.map(({ label, entry }) => {
        const mood = MOOD_OPTIONS.find((m) => m.key === entry.mood);
        const moodColor = entry.mood ? colors.moodColors[entry.mood] ?? colors.surfaceAlt : colors.surfaceAlt;
        return (
          <TouchableOpacity
            key={entry.id}
            style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
            onPress={() => onPress(entry.id)}
            activeOpacity={0.85}
          >
            <View style={[styles.cardLeft, { backgroundColor: moodColor }]}>
              <Ionicons name="time-outline" size={14} color={colors.navy} />
              <Text style={[styles.agoLabel, { color: colors.navy }]}>{label}</Text>
            </View>
            <View style={styles.cardBody}>
              {entry.title ? (
                <Text style={[styles.entryTitle, { color: colors.navy }]} numberOfLines={1}>
                  {entry.title}
                </Text>
              ) : null}
              <Text style={[styles.entryPreview, { color: colors.textMuted }]} numberOfLines={2}>
                {entry.content}
              </Text>
              {mood && (
                <View style={styles.moodRow}>
                  <Ionicons name={mood.icon} size={12} color={colors.textLight} />
                  <Text style={[styles.moodLabel, { color: colors.textLight }]}>{mood.label}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  card: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  cardLeft: {
    width: 80, paddingVertical: 16, alignItems: 'center', gap: 4, justifyContent: 'center',
  },
  agoLabel: { fontSize: 10, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  entryTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  entryPreview: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  moodLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
});
