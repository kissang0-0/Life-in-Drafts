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
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { useSecurityStore } from '@/store/securityStore';
import { NimbusMessage } from '@/components/NimbusMessage';
import { DiaryCard } from '@/components/DiaryCard';
import { HabitCard } from '@/components/HabitCard';
import { DailyCard } from '@/components/DailyCard';
import { WritingStreak } from '@/components/WritingStreak';
import { OnThisDay } from '@/components/OnThisDay';
import { MoodGarden } from '@/components/MoodGarden';
import { getGreeting, formatDate, todayString } from '@/lib/dateUtils';
import { updateHabit } from '@/lib/firestore';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import { Habit } from '@/lib/firestore';

const QUICK_ACTIONS = [
  { icon: 'pencil',   label: 'Diary',   color: '#7EC8E3', route: '/diary/new'     },
  { icon: 'camera',   label: 'Memory',  color: '#C9AEED', route: '/memories/new'  },
  { icon: 'mail',     label: 'Unsent',  color: '#FFCA6B', route: '/unsent/new'    },
  { icon: 'book',     label: 'Study',   color: '#98D4A3', route: '/study/index'   },
  { icon: 'grid',     label: 'More',    color: '#7EC8E3', route: '/(tabs)/more'   },
] as const;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { diary, habits, todayMood, setTodayMood } = useAppStore();
  const { hasPIN, lock } = useSecurityStore();

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
      <LinearGradient
        colors={[colors.primary + '22', colors.background]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              {greeting} ✨
            </Text>
            <Text style={[styles.date, { color: colors.navy }]}>{dateStr}</Text>
          </View>

          <WritingStreak entries={diary} />

          {hasPIN && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surface }]}
              onPress={lock}
            >
              <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="person" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily card */}
        <DailyCard />

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((qa) => (
            <TouchableOpacity
              key={qa.label}
              onPress={() => router.push(qa.route as any)}
              activeOpacity={0.8}
              style={styles.qaItem}
            >
              <View style={[styles.qaIcon, { backgroundColor: qa.color + '25' }]}>
                <Ionicons name={qa.icon as any} size={22} color={qa.color} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.text }]}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's mood */}
        {!todayMood ? (
          <View style={[styles.moodCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>How are you feeling?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
              {MOOD_OPTIONS.map((mood) => {
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
        ) : (
          <View style={[styles.moodSetCard, { backgroundColor: colors.moodColors[todayMood] ?? colors.surfaceAlt }]}>
            <Ionicons name={MOOD_OPTIONS.find(m => m.key === todayMood)?.icon ?? 'happy-outline'} size={20} color={colors.navy} />
            <Text style={[styles.moodSetText, { color: colors.navy }]}>
              Feeling {MOOD_OPTIONS.find(m => m.key === todayMood)?.label ?? todayMood} today
            </Text>
            <TouchableOpacity onPress={() => setTodayMood('')}>
              <Ionicons name="close-circle" size={18} color={colors.navy + '80'} />
            </TouchableOpacity>
          </View>
        )}

        {/* On This Day */}
        {diary.length > 0 && (
          <View style={styles.section}>
            <OnThisDay
              entries={diary}
              onPress={(id) => router.push(`/diary/${id}`)}
            />
          </View>
        )}

        {/* Mood Garden */}
        {diary.filter(e => e.mood).length >= 3 && (
          <MoodGarden
            entries={diary}
            onPress={() => router.push('/(tabs)/diary')}
          />
        )}

        {/* Recent diary */}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginBottom: 2 },
  date: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  seeAll: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  qaItem: { alignItems: 'center', gap: 6, flex: 1 },
  qaIcon: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
  moodCard: {
    borderRadius: 20, padding: 16, gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  moodScroll: { marginHorizontal: -4 },
  moodItem: { alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, marginHorizontal: 4, minWidth: 64 },
  moodLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  moodSetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
  },
  moodSetText: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  emptyCard: {
    alignItems: 'center', borderRadius: 24, padding: 32, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 20 },
});
