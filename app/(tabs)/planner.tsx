import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { HabitCard } from '@/components/HabitCard';
import { EmptyState } from '@/components/EmptyState';
import { addHabit, updateHabit, deleteHabit, Habit } from '@/lib/firestore';
import { todayString, formatDate } from '@/lib/dateUtils';

const HABIT_COLORS = ['#7EC8E3', '#FFE4A0', '#E8D5F5', '#A8E0D0', '#F5C2C7', '#B8D4F0', '#98D4A3'];
const HABIT_ICONS = ['star-outline', 'book-outline', 'walk-outline', 'water-outline', 'barbell-outline', 'leaf-outline', 'moon-outline', 'heart-outline'];

export default function PlannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const habits = useAppStore((s) => s.habits);
  const [showModal, setShowModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0]);
  const [adding, setAdding] = useState(false);

  const today = todayString();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const completedToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const progress = habits.length > 0 ? completedToday / habits.length : 0;

  const toggleHabit = async (habit: Habit) => {
    if (!user) return;
    const completed = habit.completedDates.includes(today);
    const newDates = completed
      ? habit.completedDates.filter((d) => d !== today)
      : [...habit.completedDates, today];
    let streak = habit.streak;
    if (!completed) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yd = yesterday.toISOString().split('T')[0];
      streak = habit.completedDates.includes(yd) ? streak + 1 : 1;
    } else {
      streak = Math.max(0, streak - 1);
    }
    await updateHabit(user.uid, habit.id, { completedDates: newDates, streak });
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim() || !user) return;
    setAdding(true);
    await addHabit(user.uid, {
      name: newHabitName.trim(),
      icon: selectedIcon,
      color: selectedColor,
      completedDates: [],
      streak: 0,
    });
    setNewHabitName('');
    setAdding(false);
    setShowModal(false);
  };

  const handleDelete = (habit: Habit) => {
    Alert.alert('Delete Habit', `Remove "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => user && deleteHabit(user.uid, habit.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.navy }]}>To Do/n't</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(new Date())}</Text>

        {/* Progress card */}
        {habits.length > 0 && (
          <View style={[styles.progressCard, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressLabel}>Today's progress</Text>
                <Text style={styles.progressCount}>
                  {completedToday}/{habits.length} habits
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>
            <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: '#fff' }]}
              />
            </View>
          </View>
        )}

        {/* Habits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Daily Habits</Text>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary + '20' }]}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {habits.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="No habits yet"
              subtitle="Add your first habit and start building streaks"
            />
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={habit.completedDates.includes(today)}
                onToggle={() => toggleHabit(habit)}
                onDelete={() => handleDelete(habit)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.navy }]}>New Habit</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: 'Nunito_400Regular' },
              ]}
              placeholder="Habit name..."
              placeholderTextColor={colors.textLight}
              value={newHabitName}
              onChangeText={setNewHabitName}
              autoFocus
            />

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Color</Text>
            <View style={styles.colorRow}>
              {HABIT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c, borderWidth: selectedColor === c ? 2.5 : 0, borderColor: colors.navy },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Icon</Text>
            <View style={styles.iconRow}>
              {HABIT_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setSelectedIcon(ic)}
                  style={[
                    styles.iconOption,
                    { backgroundColor: selectedIcon === ic ? colors.primary + '30' : colors.surfaceAlt },
                  ]}
                >
                  <Ionicons name={ic as any} size={20} color={selectedIcon === ic ? colors.primary : colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleAddHabit}
              disabled={!newHabitName.trim() || adding}
              style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: !newHabitName.trim() ? 0.5 : 1 }]}
            >
              <Text style={styles.modalBtnText}>{adding ? 'Adding...' : 'Add Habit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', marginBottom: 2 },
  date: { fontSize: 13, fontFamily: 'Nunito_400Regular', marginBottom: 20 },
  progressCard: {
    borderRadius: 20, padding: 20, marginBottom: 24, gap: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  progressCount: { color: '#fff', fontSize: 20, fontFamily: 'Nunito_800ExtraBold', marginTop: 2 },
  progressCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  progressPct: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  addBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  modalInput: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  modalLabel: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  iconRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  iconOption: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  modalBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
});
