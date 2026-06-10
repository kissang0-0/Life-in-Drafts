import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { NimbusMessage } from '@/components/NimbusMessage';

// ── Floating cloud animation ──────────────────────────────────────────────

function useFloatAnim(delay = 0, range = 6) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3200 + delay * 200, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration: 3200 + delay * 200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim.interpolate({ inputRange: [0, 1], outputRange: [0, range] });
}

// ── Insight card ──────────────────────────────────────────────────────────

type CloudCardProps = {
  icon: string;
  iconColor: string;
  label: string;
  insight: string;
  delay?: number;
  accent?: string;
};

function CloudCard({ icon, iconColor, label, insight, delay = 0, accent }: CloudCardProps) {
  const colors = useColors();
  const translateY = useFloatAnim(delay, 5);
  return (
    <Animated.View style={[
      styles.cloudCard,
      {
        backgroundColor: colors.surface,
        shadowColor: colors.shadowDeep,
        borderColor: accent ? accent + '30' : colors.borderLight,
        transform: [{ translateY }],
      },
    ]}>
      <View style={[styles.cloudCardIcon, { backgroundColor: (accent ?? iconColor) + '18' }]}>
        <Ionicons name={icon as any} size={20} color={accent ?? iconColor} />
      </View>
      <View style={styles.cloudCardBody}>
        <Text style={[styles.cloudCardLabel, { color: colors.textLight }]}>{label}</Text>
        <Text style={[styles.cloudCardInsight, { color: colors.navy }]}>{insight}</Text>
      </View>
    </Animated.View>
  );
}

// ── Weather badge ─────────────────────────────────────────────────────────

const WEATHER_MAP: Record<string, { emoji: string; label: string; gradient: string[] }> = {
  sunny:   { emoji: '☀️', label: 'Mostly Sunny Month',    gradient: ['#FFF3C4', '#FFE08A'] },
  mixed:   { emoji: '⛅',  label: 'Mixed Skies',           gradient: ['#D8EFF7', '#B8D8EE'] },
  rainy:   { emoji: '🌧',  label: 'Reflective Season',     gradient: ['#CDDFF0', '#AACCE0'] },
  stormy:  { emoji: '⛈',  label: 'Processing Weather',    gradient: ['#C8D0E0', '#A8B8CC'] },
  rainbow: { emoji: '🌈', label: 'Growth After Rain',     gradient: ['#D8F0E4', '#B8E4CC'] },
  breezy:  { emoji: '🍃', label: 'Calm & Breezy',         gradient: ['#D4F0E4', '#A8E0C8'] },
};

function getWeather(moods: string[]): keyof typeof WEATHER_MAP {
  if (!moods.length) return 'mixed';
  const counts: Record<string, number> = {};
  moods.forEach((m) => { counts[m] = (counts[m] ?? 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  if (top === 'happy' || top === 'excited') return 'sunny';
  if (top === 'calm' || top === 'grateful') return 'breezy';
  if (top === 'sad' || top === 'melancholy') return 'rainy';
  if (top === 'angry' || top === 'anxious') return 'stormy';
  if (top === 'hopeful') return 'rainbow';
  return 'mixed';
}

// ── Drifting background cloud shapes ─────────────────────────────────────

function BackgroundCloud({ x, y, size, opacity, delay }: { x: number; y: number; size: number; opacity: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 6000 + delay * 500, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration: 6000 + delay * 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: [{ translateX }, { translateY }],
        opacity,
      }}
    >
      <Text style={{ fontSize: size }}>{`☁️`}</Text>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function CloudCornerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const {
    diary, habits, todos, studySessions, socialPosts,
    unsent, memories, cycleLogs, memorySlips,
  } = useAppStore();

  // ── Data analysis (last 30 days) ──────────────────────────────────────
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const insights = useMemo(() => {
    const recentDiary = diary.filter((e) => e.createdAt >= thirtyDaysAgo);
    const recentMoods = recentDiary.map((e) => e.mood).filter(Boolean);

    // ── Mood ─────────────────────────────────────────────────────────
    let moodInsight = 'Start journaling to discover your mood patterns.';
    if (recentMoods.length >= 3) {
      const moodCounts: Record<string, number> = {};
      recentMoods.forEach((m) => { moodCounts[m] = (moodCounts[m] ?? 0) + 1; });
      const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
      const topMood = sorted[0]?.[0];
      if (topMood) {
        const pct = Math.round((moodCounts[topMood] / recentMoods.length) * 100);
        moodInsight = `Your most frequent mood this month is ${topMood} (${pct}% of entries). That's your baseline right now.`;
      }
    } else if (recentMoods.length > 0) {
      moodInsight = `You've logged ${recentMoods.length} mood${recentMoods.length > 1 ? 's' : ''} this month. Keep journaling to see patterns.`;
    }

    // ── Weekend vs weekday moods ──────────────────────────────────────
    let weekendInsight = '';
    if (recentDiary.length >= 5) {
      const weekendMoods = recentDiary.filter((e) => [0, 6].includes(e.createdAt.getDay())).map((e) => e.mood);
      const weekdayMoods = recentDiary.filter((e) => ![0, 6].includes(e.createdAt.getDay())).map((e) => e.mood);
      const happyWeekend = weekendMoods.filter((m) => m === 'happy' || m === 'excited' || m === 'calm').length;
      const happyWeekday = weekdayMoods.filter((m) => m === 'happy' || m === 'excited' || m === 'calm').length;
      if (weekendMoods.length > 0 && weekdayMoods.length > 0) {
        const wePct = Math.round((happyWeekend / weekendMoods.length) * 100);
        const wdPct = Math.round((happyWeekday / weekdayMoods.length) * 100);
        if (wePct > wdPct + 20) weekendInsight = `You feel noticeably lighter on weekends — ${wePct}% positive vs ${wdPct}% on weekdays.`;
        else if (wdPct > wePct + 20) weekendInsight = `Interestingly, you seem to thrive on weekdays — more positive entries than weekends this month.`;
        else weekendInsight = `Your mood is fairly consistent throughout the week. That's a kind of stability.`;
      }
    }

    // ── Energy ────────────────────────────────────────────────────────
    let energyInsight = 'Log energy levels in your diary to discover patterns.';
    const energyEntries = recentDiary.filter((e) => e.energyLevel != null);
    if (energyEntries.length >= 3) {
      const avg = energyEntries.reduce((s, e) => s + (e.energyLevel ?? 0), 0) / energyEntries.length;
      const label = avg >= 7 ? 'high' : avg >= 4 ? 'moderate' : 'lower';
      energyInsight = `Your average energy this month is ${avg.toFixed(1)}/10 — ${label}. ${avg < 4 ? 'More rest might help.' : avg >= 7 ? 'You\'re carrying strong energy right now.' : 'A steady rhythm.'}`;
    }

    // ── Study ─────────────────────────────────────────────────────────
    let studyInsight = 'Start study sessions to see how you learn.';
    const recentSessions = studySessions.filter((s) => new Date(s.date) >= thirtyDaysAgo);
    if (recentSessions.length >= 2) {
      const totalMins = recentSessions.reduce((s, ss) => s + ss.durationMinutes, 0);
      const avgMins = Math.round(totalMins / recentSessions.length);
      const subjectCounts: Record<string, number> = {};
      recentSessions.forEach((s) => { subjectCounts[s.subjectName] = (subjectCounts[s.subjectName] ?? 0) + s.durationMinutes; });
      const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      studyInsight = `You studied ${Math.floor(totalMins / 60)}h ${totalMins % 60}m this month across ${recentSessions.length} sessions. ${topSubject ? `${topSubject} received the most focus.` : ''} Average session: ${avgMins} min.`;
    } else if (recentSessions.length === 1) {
      studyInsight = `You've had 1 study session this month. Consistency builds over time.`;
    }

    // ── Todos ─────────────────────────────────────────────────────────
    let todoInsight = 'Add tasks to discover your productivity patterns.';
    const recentTodos = todos.filter((t) => t.createdAt >= thirtyDaysAgo);
    if (recentTodos.length >= 3) {
      const todayStr = now.toISOString().split('T')[0];
      const completedThisMonth = todos.filter((t) =>
        t.completedDates.some((d) => { const dt = new Date(d); return dt >= thirtyDaysAgo; })
      ).length;
      const todontAvoided = todos.filter(
        (t) => t.type === 'todont' && t.completedDates.some((d) => { const dt = new Date(d); return dt >= thirtyDaysAgo; })
      ).length;
      todoInsight = `You completed ${completedThisMonth} task${completedThisMonth !== 1 ? 's' : ''} this month${todontAvoided > 0 ? ` and avoided ${todontAvoided} habit${todontAvoided > 1 ? 's' : ''} on your To Don\'t list` : ''}. Every check is a win.`;
    }

    // ── Habits ────────────────────────────────────────────────────────
    let habitInsight = 'Build habits to see your streaks here.';
    if (habits.length > 0) {
      const topHabit = [...habits].sort((a, b) => b.streak - a.streak)[0];
      if (topHabit && topHabit.streak > 0) {
        habitInsight = `${topHabit.icon} ${topHabit.name} is your strongest habit — ${topHabit.streak} day streak. That kind of consistency is rare.`;
      } else {
        habitInsight = `You have ${habits.length} habit${habits.length > 1 ? 's' : ''} set up. Each day you show up is a streak waiting to begin.`;
      }
    }

    // ── Social ────────────────────────────────────────────────────────
    let socialInsight = 'Write your first Unsocial post to track your inner narrative.';
    const recentPosts = socialPosts.filter((p) => p.createdAt >= thirtyDaysAgo);
    if (recentPosts.length >= 2) {
      const allTags = recentPosts.flatMap((p) => p.tags);
      const tagCounts: Record<string, number> = {};
      allTags.forEach((t) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; });
      const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      socialInsight = `You've posted ${recentPosts.length} times this month to your private feed.${topTag ? ` Your most used tag is #${topTag}.` : ''} Your narrative is growing.`;
    } else if (recentPosts.length === 1) {
      socialInsight = 'You wrote your first Unsocial post this month. The story is beginning.';
    }

    // ── Unsent messages ───────────────────────────────────────────────
    let unsentInsight = 'Write unsent messages to process what you can\'t say out loud.';
    const recentUnsent = unsent.filter((u) => u.createdAt >= thirtyDaysAgo);
    if (recentUnsent.length >= 2) {
      const toCounts: Record<string, number> = {};
      recentUnsent.forEach((u) => { toCounts[u.to] = (toCounts[u.to] ?? 0) + 1; });
      const topRecipient = Object.entries(toCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      unsentInsight = `${recentUnsent.length} unsent messages this month${topRecipient ? `, mostly to ${topRecipient}` : ''}. Processing feelings this way takes courage.`;
    } else if (recentUnsent.length === 1) {
      unsentInsight = 'You wrote an unsent message this month. That takes a lot of self-awareness.';
    }

    // ── Memories ──────────────────────────────────────────────────────
    let memoryInsight = 'Save memories to build your visual archive.';
    const recentMemories = memories.filter((m) => m.createdAt >= thirtyDaysAgo);
    if (recentMemories.length >= 2) {
      memoryInsight = `You've preserved ${recentMemories.length} memories this month. Each one is a moment that mattered enough to keep.`;
    } else if (memories.length > 0) {
      memoryInsight = `Your memory archive has ${memories.length} moment${memories.length > 1 ? 's' : ''}. Every photo you save is a gift to your future self.`;
    }

    // ── Life Weather ──────────────────────────────────────────────────
    const weatherKey = getWeather(recentMoods);

    // ── Monthly summary ───────────────────────────────────────────────
    const diaryThisMonth = diary.filter((e) => e.createdAt.getMonth() === thisMonth && e.createdAt.getFullYear() === thisYear).length;
    const todosDoneMonth = todos.filter((t) =>
      t.completedDates.some((d) => { const dt = new Date(d); return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear; })
    ).length;
    const studyHours = Math.floor(studySessions.filter((s) => {
      const dt = new Date(s.date);
      return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    }).reduce((s, ss) => s + ss.durationMinutes, 0) / 60);
    const memoriesMonth = memories.filter((m) => m.createdAt.getMonth() === thisMonth && m.createdAt.getFullYear() === thisYear).length;

    // ── Growth milestones ─────────────────────────────────────────────
    const milestones: { icon: string; label: string }[] = [];
    if (diary.length >= 1) milestones.push({ icon: '📖', label: 'First Diary Entry' });
    if (diary.length >= 10) milestones.push({ icon: '✍️', label: '10 Diary Entries' });
    if (diary.length >= 50) milestones.push({ icon: '📚', label: '50 Diary Entries' });
    if (diary.length >= 100) milestones.push({ icon: '🏆', label: '100 Diary Entries' });
    const totalStudyHours = Math.floor(studySessions.reduce((s, ss) => s + ss.durationMinutes, 0) / 60);
    if (totalStudyHours >= 10) milestones.push({ icon: '🎓', label: '10 Study Hours' });
    if (totalStudyHours >= 100) milestones.push({ icon: '🌟', label: '100 Study Hours' });
    if (memories.length >= 10) milestones.push({ icon: '📸', label: '10 Memories Saved' });
    const topStreak = Math.max(0, ...habits.map((h) => h.streak));
    if (topStreak >= 7) milestones.push({ icon: '🔥', label: '7-Day Habit Streak' });
    if (topStreak >= 30) milestones.push({ icon: '💎', label: '30-Day Habit Streak' });

    // ── Nimbus cloud insight ──────────────────────────────────────────
    let nimbusInsight = 'The more you live in these pages, the more patterns you\'ll discover.';
    if (diaryThisMonth >= 5 && todosDoneMonth >= 3) {
      nimbusInsight = 'You\'ve been showing up for yourself consistently. Progress is quieter than you think — but I can see it.';
    } else if (diaryThisMonth >= 3) {
      nimbusInsight = 'Your garden has grown a lot recently. Every entry is a seed.';
    } else if (studyHours >= 5) {
      nimbusInsight = 'All those hours of focus are building something. You might not see it yet, but I do.';
    } else if (topStreak >= 7) {
      nimbusInsight = `A ${topStreak}-day streak is not an accident. That's you choosing yourself, every single day.`;
    }

    const hasData = diary.length > 0 || todos.length > 0 || studySessions.length > 0 || memories.length > 0;

    return {
      moodInsight, weekendInsight, energyInsight, studyInsight,
      todoInsight, habitInsight, socialInsight, unsentInsight,
      memoryInsight, weatherKey, diaryThisMonth, todosDoneMonth,
      studyHours, memoriesMonth, milestones, nimbusInsight, hasData,
      recentMoodsCount: recentMoods.length,
    };
  }, [diary, habits, todos, studySessions, socialPosts, unsent, memories]);

  const weather = WEATHER_MAP[insights.weatherKey];

  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <View style={[styles.container, { backgroundColor: '#EBF4FF' }]}>
      {/* Drifting background clouds */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <BackgroundCloud x={20}  y={topPad + 30} size={32} opacity={0.18} delay={0} />
        <BackgroundCloud x={210} y={topPad + 60} size={24} opacity={0.14} delay={2} />
        <BackgroundCloud x={110} y={topPad + 12} size={20} opacity={0.12} delay={1} />
        <BackgroundCloud x={280} y={topPad + 90} size={28} opacity={0.10} delay={3} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 20, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.navy }]}>Cloud Corner</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>A bird's-eye view of your becoming</Text>
        </View>

        {/* Life Weather Card */}
        <LinearGradient
          colors={weather.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weatherCard}
        >
          <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
          <View style={styles.weatherInfo}>
            <Text style={[styles.weatherMonth, { color: colors.textMuted }]}>{monthName}'s Weather</Text>
            <Text style={[styles.weatherLabel, { color: colors.navy }]}>{weather.label}</Text>
            {insights.recentMoodsCount > 0 && (
              <Text style={[styles.weatherSub, { color: colors.textMuted }]}>Based on {insights.recentMoodsCount} mood logs</Text>
            )}
          </View>
        </LinearGradient>

        {/* Monthly Summary */}
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>This Month</Text>
        <View style={styles.summaryGrid}>
          {[
            { icon: 'book-outline', value: insights.diaryThisMonth, label: 'Diary Entries', color: colors.primary },
            { icon: 'checkmark-done-outline', value: insights.todosDoneMonth, label: 'Tasks Done', color: '#5DB87A' },
            { icon: 'school-outline', value: insights.studyHours, label: 'Study Hours', color: '#A78BFA' },
            { icon: 'images-outline', value: insights.memoriesMonth, label: 'Memories', color: colors.accentDeep },
          ].map((s) => (
            <View key={s.label} style={[styles.summaryCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
              <View style={[styles.summaryIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon as any} size={16} color={s.color} />
              </View>
              <Text style={[styles.summaryValue, { color: colors.navy }]}>{s.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Nimbus */}
        <NimbusMessage message={insights.nimbusInsight} style={{ marginBottom: 24 }} />

        {/* Insight Clouds */}
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Your Patterns</Text>
        <View style={styles.cloudGrid}>
          <CloudCard
            icon="leaf-outline"
            iconColor={colors.primary}
            label="Mood"
            insight={insights.moodInsight}
            delay={0}
          />
          {insights.weekendInsight ? (
            <CloudCard
              icon="calendar-outline"
              iconColor={colors.accentDeep}
              label="Rhythm"
              insight={insights.weekendInsight}
              delay={1}
              accent={colors.accentDeep}
            />
          ) : null}
          <CloudCard
            icon="flash-outline"
            iconColor="#A78BFA"
            label="Energy"
            insight={insights.energyInsight}
            delay={2}
            accent="#A78BFA"
          />
          <CloudCard
            icon="school-outline"
            iconColor="#7C3AED"
            label="Study"
            insight={insights.studyInsight}
            delay={3}
            accent="#7C3AED"
          />
          <CloudCard
            icon="checkmark-circle-outline"
            iconColor="#5DB87A"
            label="Productivity"
            insight={insights.todoInsight}
            delay={0}
            accent="#5DB87A"
          />
          <CloudCard
            icon="repeat-outline"
            iconColor={colors.accentDeep}
            label="Habits"
            insight={insights.habitInsight}
            delay={1}
            accent={colors.accentDeep}
          />
          <CloudCard
            icon="planet-outline"
            iconColor="#F472B6"
            label="Inner Feed"
            insight={insights.socialInsight}
            delay={2}
            accent="#F472B6"
          />
          <CloudCard
            icon="chatbubble-ellipses-outline"
            iconColor={colors.primary}
            label="Unsent"
            insight={insights.unsentInsight}
            delay={3}
          />
          <CloudCard
            icon="images-outline"
            iconColor={colors.accentDeep}
            label="Memories"
            insight={insights.memoryInsight}
            delay={0}
            accent={colors.accentDeep}
          />
        </View>

        {/* Growth Milestones */}
        {insights.milestones.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Growth Timeline</Text>
            <View style={styles.milestonesList}>
              {insights.milestones.map((m, i) => (
                <View key={i} style={[styles.milestoneItem, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
                  <Text style={styles.milestoneEmoji}>{m.icon}</Text>
                  <Text style={[styles.milestoneLabel, { color: colors.text }]}>{m.label}</Text>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {!insights.hasData && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyCloud}>☁️</Text>
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>Your sky is waiting</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              The more you live in these pages, the more patterns you'll discover.
            </Text>
          </View>
        )}

        {/* Brand phrase */}
        <View style={styles.brandSection}>
          <Text style={[styles.brandPhrase, { color: colors.textLight }]}>The Archive of Becoming ✦</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', marginBottom: 2 },
  subtitle: { fontSize: 13, fontFamily: 'Nunito_400Regular' },

  // Weather
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  weatherEmoji: { fontSize: 44 },
  weatherInfo: { flex: 1, gap: 2 },
  weatherMonth: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  weatherLabel: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  weatherSub: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 2 },

  // Summary grid
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1, minWidth: '44%', borderRadius: 18, padding: 14,
    alignItems: 'center', gap: 4,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  summaryLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },

  // Cloud cards
  cloudGrid: { gap: 12, marginBottom: 32 },
  cloudCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  cloudCardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cloudCardBody: { flex: 1, gap: 4 },
  cloudCardLabel: { fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  cloudCardInsight: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 22 },

  // Milestones
  milestonesList: { gap: 8, marginBottom: 32 },
  milestoneItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  milestoneEmoji: { fontSize: 22 },
  milestoneLabel: { flex: 1, fontSize: 14, fontFamily: 'Nunito_700Bold' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyCloud: { fontSize: 64 },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  // Brand
  brandSection: { alignItems: 'center', paddingVertical: 16 },
  brandPhrase: { fontSize: 12, fontFamily: 'Nunito_400Regular', letterSpacing: 1, fontStyle: 'italic' },
});
