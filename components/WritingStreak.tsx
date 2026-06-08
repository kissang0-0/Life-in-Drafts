import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { DiaryEntry } from '@/lib/firestore';

type Props = { entries: DiaryEntry[] };

function computeStreak(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;

  const days = new Set(
    entries.map((e) => e.createdAt.toISOString().split('T')[0])
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Allow today or yesterday as start
  const todayStr = cursor.toISOString().split('T')[0];
  if (!days.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const s = cursor.toISOString().split('T')[0];
    if (!days.has(s)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function WritingStreak({ entries }: Props) {
  const colors = useColors();
  const streak = computeStreak(entries);

  if (streak === 0) return null;

  const isHot = streak >= 7;

  return (
    <View style={[styles.badge, { backgroundColor: isHot ? '#FFF3E0' : colors.surfaceAlt, borderColor: isHot ? '#FF9800' : colors.border }]}>
      <Text style={styles.fire}>{isHot ? '🔥' : '✍️'}</Text>
      <Text style={[styles.count, { color: isHot ? '#E65100' : colors.navy }]}>{streak}</Text>
      <Text style={[styles.label, { color: isHot ? '#BF360C' : colors.textMuted }]}>
        day{streak !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
  },
  fire: { fontSize: 14 },
  count: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  label: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
});
