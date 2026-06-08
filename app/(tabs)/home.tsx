import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { NimbusMessage } from '@/components/NimbusMessage';
import { DiaryCard } from '@/components/DiaryCard';
import { HabitCard } from '@/components/HabitCard';
import { getGreeting, formatDate, todayString } from '@/lib/dateUtils';
import { updateHabit } from '@/lib/firestore';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import { Habit } from '@/lib/firestore';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { diary, habits, todayMood, setTodayMood } = useAppStore();

  const today = todayString();
  const recentEntries = diary.slice(0, 3);
  const todayHabits = habits.slice(0, 4);

  const greeting = getGreeting();
  const dateStr = formatDate(new Date());

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={[styles.headerBg, { backgroundColor: colors.primary + '15' }]} />
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting} ☁️</Text>
            <Text style={[styles.date, { color: colors.navy }]}>{dateStr}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="person" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nimbus message */}
        <NimbusMessage style={styles.section} />

        {/* Quick actions */}
        <View style={[styles.section, styles.quickActions]}>
          <QuickAction
            icon="pencil"
            label="New Entry"
            color={colors.primary}
            onPress={() => router.push('/diary/new')}
          />
          <QuickAction
            icon="camera"
            label="Memory"
            color={colors.lavenderDeep}
            onPress={() => router.push('/memories/new')}
          />
          <QuickAction
            icon="mail"
            label="Unsent"
            color={colors.accentDeep}
            onPress={() => router.push('/unsent/index')}
          />
          <QuickAction
            icon="book"
            label="Study"
            color={colors.success}
            onPress={() => router.push('/study/index')}
          />
        </View>

        {/* Today's mood */}
        {!todayMood && (
          <View style={[styles.section, styles.moodCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>How are you feeling?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
              {MOOD_OPTIONS.slice(0, 6).map((mood) => {
                const mc = colors.moodColors[mood.key] ?? colors.surfaceAlt;
                return (
                  <TouchableOpacity
                    key={mood.key}
                    onPress={() => setTodayMood(mood.key)}
                    style={[styles.moodItem, { backgroundColor: mc }]}
                  >
                    <Ionicons name={mood.icon} size={20} color={colors.navy} />
                    <Text style={[styles.moodLabel, { color: colors.navy }]}>{mood.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Recent diary entries */}
        {recentEntries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>Recent entries</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/diary')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentEntries.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                onPress={() => router.push(`/diary/${entry.id}`)}
              />
            ))}
          </View>
        )}

        {/* Today's habits */}
        {todayHabits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>Today's habits</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/planner')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {todayHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={habit.completedDates.includes(today)}
                onToggle={() => toggleHabit(habit)}
              />
            ))}
          </View>
        )}

        {recentEntries.length === 0 && todayHabits.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>Your archive awaits</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Write your first entry, add a memory, or set a daily habit to begin.
            </Text>
          </View>
        )}

        <View style={{ height: Platform.OS === 'web' ? 34 : 16 }} />
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon, label, color, onPress,
}: { icon: string; label: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.qaItem}>
      <View style={[styles.qaIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.qaLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, position: 'relative', overflow: 'hidden' },
  headerBg: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -100, right: -80 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greeting: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 2 },
  date: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  seeAll: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  qaItem: { alignItems: 'center', gap: 6, flex: 1 },
  qaIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  moodCard: {
    borderRadius: 20, padding: 16, gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  moodScroll: { marginHorizontal: -4 },
  moodItem: { alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, marginHorizontal: 4, minWidth: 64 },
  moodLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  emptyCard: {
    alignItems: 'center', borderRadius: 24, padding: 32, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 20 },
});
