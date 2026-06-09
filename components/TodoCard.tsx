import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Todo, TodoPriority } from '@/lib/firestore';
import * as Haptics from 'expo-haptics';

const PRIORITY_COLORS: Record<TodoPriority, string> = {
  low: '#5DB87A',
  medium: '#F5B731',
  high: '#F5922F',
  urgent: '#E8706A',
};

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

type Props = {
  todo: Todo;
  isCompletedToday: boolean;
  today: string;
  onToggle: () => void;
  onDelete: () => void;
  onUploadProof: () => void;
  onReflect: () => void;
  onFocusToggle: () => void;
};

export function TodoCard({ todo, isCompletedToday, today, onToggle, onDelete, onUploadProof, onReflect, onFocusToggle }: Props) {
  const colors = useColors();
  const priorityColor = PRIORITY_COLORS[todo.priority];
  const isTodont = todo.type === 'todont';

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      todo.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isTodont ? 'Delete Avoidance' : 'Delete Task', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={handleLongPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.shadowDeep,
          borderLeftColor: priorityColor,
          opacity: isCompletedToday ? 0.72 : 1,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.75}
        style={[
          styles.checkbox,
          {
            backgroundColor: isCompletedToday ? priorityColor : 'transparent',
            borderColor: isCompletedToday ? priorityColor : colors.border,
            borderRadius: isTodont ? 14 : 8,
          },
        ]}
      >
        {isCompletedToday && (
          <Ionicons
            name={isTodont ? 'shield-checkmark' : 'checkmark'}
            size={15}
            color="#fff"
          />
        )}
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              {
                color: isCompletedToday ? colors.textMuted : colors.text,
                textDecorationLine: isCompletedToday && !isTodont ? 'line-through' : 'none',
                flex: 1,
              },
            ]}
            numberOfLines={2}
          >
            {isTodont ? "Don't: " : ''}{todo.title}
          </Text>
          <TouchableOpacity onPress={onFocusToggle} style={styles.focusBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={todo.isFocused ? 'star' : 'star-outline'}
              size={14}
              color={todo.isFocused ? colors.accentDeep : colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {todo.description ? (
          <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={1}>
            {todo.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.categoryText, { color: colors.textMuted }]}>{todo.category}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22' }]}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {PRIORITY_LABELS[todo.priority]}
            </Text>
          </View>
          {todo.repeat !== 'none' && (
            <View style={[styles.repeatBadge, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="repeat" size={10} color={colors.primary} />
              <Text style={[styles.repeatText, { color: colors.primary }]}>{todo.repeat}</Text>
            </View>
          )}
          {todo.streak > 0 && (
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={11} color={colors.accentDeep} />
              <Text style={[styles.streakText, { color: colors.accentDeep }]}>{todo.streak}d</Text>
            </View>
          )}
        </View>

        {isCompletedToday && !todo.proofImageUri && todo.requiresProof && (
          <TouchableOpacity
            onPress={onUploadProof}
            style={[styles.proofBtn, { borderColor: colors.primary }]}
          >
            <Ionicons name="camera-outline" size={13} color={colors.primary} />
            <Text style={[styles.proofBtnText, { color: colors.primary }]}>Upload Proof</Text>
          </TouchableOpacity>
        )}

        {todo.proofImageUri ? (
          <Image source={{ uri: todo.proofImageUri }} style={styles.proofThumb} resizeMode="cover" />
        ) : null}

        {isCompletedToday && !todo.reflection && (
          <TouchableOpacity onPress={onReflect} style={styles.reflectBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Ionicons name="chatbubble-outline" size={11} color={colors.textLight} />
            <Text style={[styles.reflectBtnText, { color: colors.textLight }]}>Add reflection</Text>
          </TouchableOpacity>
        )}

        {todo.reflection ? (
          <Text style={[styles.reflectionText, { color: colors.textMuted, backgroundColor: colors.surfaceAlt }]}>
            💭 {todo.reflection}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderLeftWidth: 3.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  body: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', lineHeight: 20 },
  focusBtn: { marginTop: 2 },
  desc: { fontSize: 12, fontFamily: 'Nunito_400Regular', lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryText: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  priorityDot: { width: 5, height: 5, borderRadius: 3 },
  priorityText: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  repeatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  repeatText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakText: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  proofBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 5, alignSelf: 'flex-start', marginTop: 2,
  },
  proofBtnText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  proofThumb: {
    width: '100%', height: 120, borderRadius: 10,
    marginTop: 6,
  },
  reflectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 2,
  },
  reflectBtnText: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  reflectionText: {
    fontSize: 12, fontFamily: 'Nunito_400Regular', fontStyle: 'italic',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    lineHeight: 17, marginTop: 2,
  },
});
