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
import NimbusBird from '@/components/NimbusBird';
import { DiaryCard } from '@/components/DiaryCard';
import { HabitCard } from '@/components/HabitCard';
import { WritingStreak } from '@/components/WritingStreak';
import { getDailyNimbusMessage } from '@/constants/nimbusMessages';
import { getGreeting, formatDate, todayString } from '@/lib/dateUtils';
import { updateHabit } from '@/lib/firestore';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import { Habit } from '@/lib/firestore';

const QUICK_ACTIONS = [
  { icon: 'pencil',        label: 'Dear Me',  color: '#7EC8E3', route: '/diary/new'     },
  { icon: 'camera',        label: 'Memory',   color: '#C9AEED', route: '/memories/new'  },
  { icon: 'mail',          label: 'Unsent',   color: '#FFCA6B', route: '/unsent/new'    },
  { icon: 'book',          label: 'Study',    color: '#98D4A3', route: '/study/index'   },
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

  const nimbusMessage = useMemo(
    () => getDailyNimbusMessage(todayMood || undefined),
    [todayMood]
  );

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
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting} ✨</Text>
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Nimbus hero card ── */}
        <LinearGradient
          colors={[colors.primary + '18', colors.lavender + '28']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.nimbusCard, { borderColor: colors.primary + '30' }]}
        >
          <View style={styles.nimbusLeft}>
            <NimbusBird size={110} />
          </View>
          <View style={styles.nimbusBubble}>
            <Text style={[styles.nimbusName, { color: colors.primary }]}>✦ Nimbus</Text>
            <Text style={[styles.nimbusMsg, { color: colors.navy }]}>{nimbusMessage}</Text>
            {todayMood ? (
              <View style={[styles.moodBadge, { backgroundColor: (colors.moodColors?.[todayMood] ?? colors.surfaceAlt) + '50' }]}>
                <Text style={styles.moodBadgeText}>
                  {MOOD_OPTIONS.find(m => m.key === todayMood)?.emoji ?? '💙'} Feeling {MOOD_OPTIONS.find(m => m.key === todayMood)?.label ?? todayMood}
                </Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* ── Mood picker (if not set) ── */}
        {!todayMood ? (
          <View style={[styles.moodCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <Text style={[styles.moodQuestion, { color: colors.navy }]}>How are you feeling today?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
              {MOOD_OPTIONS.map((mood) => {
                const mc = colors.moodColors?.[mood.key] ?? colors.surfaceAlt;
                return (
                  <TouchableOpacity
                    key={mood.key}
                    onPress={() => setTodayMood(mood.key)}
                    style={[styles.moodPill, { backgroundColor: mc + '55' }]}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: colors.navy }]}>{mood.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.moodSetRow, { backgroundColor: (colors.moodColors?.[todayMood] ?? colors.surfaceAlt) + '40' }]}>
            <Text style={styles.moodSetEmoji}>
              {MOOD_OPTIONS.find(m => m.key === todayMood)?.emoji ?? '💙'}
            </Text>
            <Text style={[styles.moodSetText, { color: colors.navy }]}>
              Feeling {MOOD_OPTIONS.find(m => m.key === todayMood)?.label ?? todayMood} today
            </Text>
            <TouchableOpacity onPress={() => setTodayMood('')} style={styles.moodClear}>
              <Ionicons name="close-circle" size={18} color={colors.navy + '70'} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((qa) => (
            <TouchableOpacity
              key={qa.label}
              onPress={() => router.push(qa.route as any)}
              activeOpacity={0.8}
              style={[styles.qaCard, { backgroundColor: qa.color + '18', borderColor: qa.color + '40' }]}
            >
              <View style={[styles.qaIcon, { backgroundColor: qa.color + '25' }]}>
                <Ionicons name={qa.icon as any} size={20} color={qa.color} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.navy }]}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent entries ── */}
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

        {/* ── Today's habits ── */}
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

        {/* ── Empty state ── */}
        {recentEntries.length === 0 && todayHabits.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
            <NimbusBird size={96} />
            <Text style={[styles.nimbusLabel, { color: colors.primary }]}>✦ Nimbus</Text>
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>Your archive awaits</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Write your first entry, capture a memory, or start a daily habit.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/diary/new')}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.emptyBtnText}>Write first entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Top bar */
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  greeting: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginBottom: 2 },
  date: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  /* Nimbus hero card */
  nimbusCard: {
    borderRadius: 24, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 16, paddingVertical: 12, paddingLeft: 8,
    overflow: 'hidden',
  },
  nimbusLeft: { alignItems: 'center', justifyContent: 'flex-end', width: 110 },
  nimbusBubble: { flex: 1, gap: 8, paddingLeft: 4 },
  nimbusName: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  nimbusMsg: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', lineHeight: 22 },
  moodBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  moodBadgeText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  /* Mood picker */
  moodCard: {
    borderRadius: 20, padding: 14, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  moodQuestion: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  moodScroll: { marginHorizontal: -4 },
  moodPill: {
    alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 16, marginHorizontal: 4,
  },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  moodSetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
  },
  moodSetEmoji: { fontSize: 20 },
  moodSetText: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  moodClear: { padding: 2 },

  /* Quick actions */
  quickRow: { flexDirection: 'row', gap: 10 },
  qaCard: {
    flex: 1, alignItems: 'center', gap: 7,
    paddingVertical: 14, borderRadius: 18, borderWidth: 1.5,
  },
  qaIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', textAlign: 'center' },

  /* Sections */
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  seeAll: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  /* Empty state */
  emptyCard: {
    alignItems: 'center', borderRadius: 24, padding: 32, gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  nimbusLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold' },
});
