import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Habit } from '@/lib/firestore';
import * as Haptics from 'expo-haptics';

type Props = {
  habit: Habit;
  isCompleted: boolean;
  onToggle: () => void;
  onDelete?: () => void;
};

export function HabitCard({ habit, isCompleted, onToggle, onDelete }: Props) {
  const colors = useColors();

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
      <TouchableOpacity
        onPress={handleToggle}
        style={[
          styles.checkbox,
          {
            backgroundColor: isCompleted ? habit.color || colors.primary : 'transparent',
            borderColor: isCompleted ? habit.color || colors.primary : colors.border,
          },
        ]}
        activeOpacity={0.8}
      >
        {isCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>

      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            { color: isCompleted ? colors.textMuted : colors.text, textDecorationLine: isCompleted ? 'line-through' : 'none' },
          ]}
        >
          {habit.name}
        </Text>
        {habit.streak > 0 && (
          <View style={styles.streak}>
            <Ionicons name="flame" size={11} color={colors.accentDeep} />
            <Text style={[styles.streakText, { color: colors.accentDeep }]}>{habit.streak} day streak</Text>
          </View>
        )}
      </View>

      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color={colors.textLight} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakText: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  deleteBtn: {
    padding: 4,
  },
});
