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
          style={[styles.nestBtn, { backgroundColor: colors.lavender + '60', borderColor: colors.lavenderDeep + '40' }]}
          onPress={() => router.push('/(tabs)/nest')}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.lavenderDeep} />
          <Text style={[styles.nestBtnLabel, { color: colors.lavenderDeep }]}>Nimbus' Nest</Text>
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

        {/* ── Feature shortcuts: Row 1 ── */}
        <View style={styles.featureRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/forkcast' as any)}
            activeOpacity={0.8}
            style={styles.featureCardWrap}
          >
            <LinearGradient
              colors={['#5DB87A22', '#FFCA6B22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCard, { borderColor: '#5DB87A55' }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#5DB87A25' }]}>
                <Ionicons name="nutrition-outline" size={24} color="#5DB87A" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.navy }]}>Forkcast</Text>
              <Text style={[styles.featureSub, { color: colors.textMuted }]}>Meals & calories</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/siphappens' as any)}
            activeOpacity={0.8}
            style={styles.featureCardWrap}
          >
            <LinearGradient
              colors={['#7EC8E322', '#C9AEED22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCard, { borderColor: '#7EC8E355' }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#7EC8E325' }]}>
                <Ionicons name="water-outline" size={24} color="#7EC8E3" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.navy }]}>Sip Happens</Text>
              <Text style={[styles.featureSub, { color: colors.textMuted }]}>Hydration tracker</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/lightsout' as any)}
            activeOpacity={0.8}
            style={styles.featureCardWrap}
          >
            <LinearGradient
              colors={['#1A2F5E18', '#C9AEED18']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCard, { borderColor: '#C9AEED50' }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#1A2F5E18' }]}>
                <Ionicons name="moon-outline" size={24} color="#8B9DC3" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.navy }]}>Lights Out</Text>
              <Text style={[styles.featureSub, { color: colors.textMuted }]}>Sleep tracker</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Row 2: What Lingers + Barefaced + Cycle & Error ── */}
        <View style={styles.featureRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/whatlingers' as any)}
            activeOpacity={0.8}
            style={styles.featureCardWrap}
          >
            <LinearGradient
              colors={['#D4D8E840', '#E8EAF020']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCard, { borderColor: '#B0B8D055' }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#B0B8D025' }]}>
                <Ionicons name="eye-outline" size={24} color="#6B7A9F" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.navy }]}>What Lingers</Text>
              <Text style={[styles.featureSub, { color: colors.textMuted }]}>Pattern awareness</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/barefaced' as any)}
            activeOpacity={0.8}
            style={styles.featureCardWrap}
          >
            <LinearGradient
              colors={['#E8F0FF40', '#D4E4F820']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCard, { borderColor: '#B8C8E055' }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#B8C8E025' }]}>
                <Ionicons name="sparkles-outline" size={24} color="#7A9FC9" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.navy }]}>Barefaced</Text>
              <Text style={[styles.featureSub, { color: colors.textMuted }]}>Skincare ritual</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/cycle' as any)}
            activeOpacity={0.8}
            style={styles.featureCardWrap}
          >
            <LinearGradient
              colors={['#C9AEED22', '#7EC8E322']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureCard, { borderColor: '#C9AEED55' }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#C9AEED25' }]}>
                <Ionicons name="moon-outline" size={24} color="#C9AEED" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.navy }]}>Cycle</Text>
              <Text style={[styles.featureSub, { color: colors.textMuted }]}>& Error</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  nestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  nestBtnLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },

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

  /* What Lingers card */
  lingerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  lingerIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  lingerTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  lingerSub: { fontSize: 11, fontFamily: 'Nunito_400Regular', fontStyle: 'italic', marginTop: 1 },

  /* Feature shortcut cards */
  featureRow: { flexDirection: 'row', gap: 10 },
  featureCardWrap: { flex: 1 },
  featureCard: {
    borderRadius: 20, borderWidth: 1.5,
    paddingVertical: 18, paddingHorizontal: 14,
    alignItems: 'center', gap: 8,
  },
  featureIconWrap: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  featureSub: { fontSize: 11, fontFamily: 'Nunito_400Regular', textAlign: 'center' },

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
