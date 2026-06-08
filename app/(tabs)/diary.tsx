import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { DiaryCard } from '@/components/DiaryCard';
import { EmptyState } from '@/components/EmptyState';
import { FloatingButton } from '@/components/FloatingButton';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import { MOOD_FLOWERS } from '@/constants/quotes';
import { DiaryEntry } from '@/lib/firestore';
import { todayString } from '@/lib/dateUtils';

type ViewMode = 'list' | 'calendar' | 'timeline';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { first, daysInMonth };
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function MoodBar({ entries }: { entries: DiaryEntry[] }) {
  const colors = useColors();
  const counts: Record<string, number> = {};
  for (const e of entries) {
    if (e.mood) counts[e.mood] = (counts[e.mood] ?? 0) + 1;
  }
  const sorted = MOOD_OPTIONS.filter((m) => counts[m.key]).sort((a, b) => (counts[b.key] ?? 0) - (counts[a.key] ?? 0));
  if (sorted.length === 0) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <View style={moodBarStyles.wrapper}>
      <Text style={[moodBarStyles.title, { color: colors.navy }]}>Mood overview</Text>
      <View style={moodBarStyles.bar}>
        {sorted.map((m) => (
          <View
            key={m.key}
            style={[moodBarStyles.segment, { backgroundColor: colors.moodColors[m.key] ?? colors.surfaceAlt, flex: (counts[m.key] ?? 0) / total }]}
          />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={moodBarStyles.legend}>
          {sorted.slice(0, 5).map((m) => {
            const flower = MOOD_FLOWERS[m.key];
            return (
              <View key={m.key} style={moodBarStyles.legendItem}>
                <Text style={moodBarStyles.flower}>{flower?.emoji ?? ''}</Text>
                <Text style={[moodBarStyles.legendLabel, { color: colors.textMuted }]}>{m.label}</Text>
                <Text style={[moodBarStyles.legendCount, { color: colors.navy }]}>{counts[m.key]}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const moodBarStyles = StyleSheet.create({
  wrapper: { gap: 8, marginBottom: 4 },
  title: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  bar: { height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  segment: { height: '100%' },
  legend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flower: { fontSize: 14 },
  legendLabel: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  legendCount: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
});

function CalendarView({ entries, onPress }: { entries: DiaryEntry[]; onPress: (id: string) => void }) {
  const colors = useColors();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const entryMap = useMemo(() => {
    const map: Record<string, DiaryEntry[]> = {};
    for (const e of entries) {
      const k = dateKey(e.createdAt);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    return map;
  }, [entries]);

  const { first, daysInMonth } = getCalendarDays(year, month);
  const monthName = new Date(year, month).toLocaleDateString([], { month: 'long', year: 'numeric' });
  const today = todayString();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <View style={calStyles.wrapper}>
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.navy} />
        </TouchableOpacity>
        <Text style={[calStyles.monthLabel, { color: colors.navy }]}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.navy} />
        </TouchableOpacity>
      </View>
      <View style={calStyles.dayHeaders}>
        {DAYS.map((d) => (
          <Text key={d} style={[calStyles.dayHeader, { color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>
      <View style={calStyles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={calStyles.cell} />;
          const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEntries = entryMap[k] ?? [];
          const isToday = k === today;
          const topMood = dayEntries[0]?.mood;
          const moodColor = topMood ? colors.moodColors[topMood] ?? colors.surfaceAlt : null;
          return (
            <TouchableOpacity
              key={k}
              style={[
                calStyles.cell,
                isToday && { borderColor: colors.primary, borderWidth: 2, borderRadius: 10 },
                moodColor ? { backgroundColor: moodColor } : {},
              ]}
              onPress={() => dayEntries.length > 0 && onPress(dayEntries[0].id)}
              activeOpacity={dayEntries.length > 0 ? 0.7 : 1}
            >
              <Text style={[calStyles.dayNum, { color: isToday ? colors.primary : dayEntries.length > 0 ? colors.navy : colors.textLight }]}>
                {day}
              </Text>
              {dayEntries.length > 0 && <View style={[calStyles.dot, { backgroundColor: colors.navy + '60' }]} />}
              {dayEntries.length > 1 && <Text style={[calStyles.multiCount, { color: colors.navy }]}>+{dayEntries.length - 1}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrapper: { gap: 8 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  dayHeaders: { flexDirection: 'row' },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Nunito_700Bold', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 2 },
  dayNum: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  multiCount: { fontSize: 8, fontFamily: 'Nunito_700Bold' },
});

function TimelineView({ entries, onPress }: { entries: DiaryEntry[]; onPress: (id: string) => void }) {
  const colors = useColors();
  const grouped: { date: string; items: DiaryEntry[] }[] = useMemo(() => {
    const map: Record<string, DiaryEntry[]> = {};
    for (const e of entries) {
      const k = e.createdAt.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    return Object.entries(map).map(([date, items]) => ({ date, items }));
  }, [entries]);

  if (grouped.length === 0) return <EmptyState icon="book-outline" title="Your diary is empty" subtitle="Write your first entry to begin your archive" />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tlStyles.container}>
      {grouped.map(({ date, items }) => (
        <View key={date} style={tlStyles.group}>
          <View style={tlStyles.dateRow}>
            <View style={[tlStyles.dateDot, { backgroundColor: colors.primary }]} />
            <Text style={[tlStyles.dateLabel, { color: colors.textMuted }]}>{date}</Text>
          </View>
          <View style={[tlStyles.lineContainer, { borderLeftColor: colors.border }]}>
            {items.map((entry) => {
              const mood = MOOD_OPTIONS.find((m) => m.key === entry.mood);
              const moodColor = entry.mood ? colors.moodColors[entry.mood] ?? colors.surfaceAlt : colors.surfaceAlt;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[tlStyles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
                  onPress={() => onPress(entry.id)}
                  activeOpacity={0.85}
                >
                  {mood && (
                    <View style={[tlStyles.moodStripe, { backgroundColor: moodColor }]}>
                      <Ionicons name={mood.icon} size={14} color={colors.navy} />
                    </View>
                  )}
                  <View style={tlStyles.cardContent}>
                    <Text style={[tlStyles.time, { color: colors.textLight }]}>
                      {entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {entry.title ? <Text style={[tlStyles.title, { color: colors.navy }]} numberOfLines={1}>{entry.title}</Text> : null}
                    <Text style={[tlStyles.preview, { color: colors.textMuted }]} numberOfLines={2}>{entry.content}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const tlStyles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8 },
  group: { marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dateDot: { width: 10, height: 10, borderRadius: 5 },
  dateLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  lineContainer: { marginLeft: 4, paddingLeft: 20, borderLeftWidth: 1.5, gap: 10, paddingBottom: 16 },
  card: {
    flexDirection: 'row', borderRadius: 14, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  moodStripe: { width: 6 },
  cardContent: { flex: 1, padding: 12, gap: 4 },
  time: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  title: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  preview: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
});

export default function DiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const diary = useAppStore((s) => s.diary);
  const [search, setSearch] = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const filtered = useMemo(() => diary.filter((e) => {
    const matchSearch =
      !search ||
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchMood = !filterMood || e.mood === filterMood;
    return matchSearch && matchMood;
  }), [diary, search, filterMood]);

  const VIEW_MODES: { key: ViewMode; icon: string }[] = [
    { key: 'list',     icon: 'list-outline'      },
    { key: 'timeline', icon: 'git-branch-outline' },
    { key: 'calendar', icon: 'calendar-outline'   },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#F5EEFF', '#EBF4FF', colors.background]}
        locations={[0, 0.6, 1]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <Text style={[styles.title, { color: colors.navy }]}>Dear Me,</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {today} · {diary.length} {diary.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>

          {/* View mode toggle */}
          <View style={[styles.viewToggle, { backgroundColor: 'rgba(255,255,255,0.75)', borderColor: colors.border }]}>
            {VIEW_MODES.map((vm) => (
              <TouchableOpacity
                key={vm.key}
                onPress={() => setViewMode(vm.key)}
                style={[
                  styles.viewToggleBtn,
                  viewMode === vm.key && { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons
                  name={vm.icon as any}
                  size={15}
                  color={viewMode === vm.key ? '#fff' : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mood overview */}
        {diary.length >= 3 && <MoodBar entries={diary} />}

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.85)', borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
            placeholder="Search entries..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Mood filter chips */}
        {viewMode === 'list' && (
          <FlatList
            horizontal
            data={[{ key: '', label: 'All ✨', icon: 'apps-outline' as const }, ...MOOD_OPTIONS]}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            renderItem={({ item }) => {
              const isActive = filterMood === item.key;
              const mc = item.key ? colors.moodColors[item.key] ?? colors.surfaceAlt : colors.lavender;
              return (
                <TouchableOpacity
                  onPress={() => setFilterMood(item.key)}
                  activeOpacity={0.75}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? mc : 'rgba(255,255,255,0.8)',
                      borderColor: isActive ? colors.navy + '30' : colors.border,
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  <Ionicons name={item.icon as any} size={12} color={isActive ? colors.navy : colors.textMuted} />
                  <Text style={[styles.filterLabel, { color: isActive ? colors.navy : colors.textMuted }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </LinearGradient>

      {/* Content */}
      {viewMode === 'list' && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
          ]}
          renderItem={({ item }) => (
            <DiaryCard entry={item} onPress={() => router.push(`/diary/${item.id}`)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title={search || filterMood ? 'No matching entries' : 'Start your archive'}
              subtitle={search || filterMood ? 'Try a different search or filter' : 'Write your first entry — future you will thank you 💙'}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {viewMode === 'timeline' && (
        <TimelineView entries={filtered} onPress={(id) => router.push(`/diary/${id}`)} />
      )}

      {viewMode === 'calendar' && (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CalendarView entries={filtered} onPress={(id) => router.push(`/diary/${id}`)} />
        </ScrollView>
      )}

      <FloatingButton onPress={() => router.push('/diary/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleGroup: { gap: 2 },
  title: { fontSize: 30, fontFamily: 'Nunito_800ExtraBold', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  viewToggle: {
    flexDirection: 'row', borderRadius: 14, padding: 4, gap: 2,
    borderWidth: 1.5, marginTop: 4,
  },
  viewToggleBtn: {
    padding: 7, borderRadius: 10,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filters: { gap: 7, paddingVertical: 2 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20,
  },
  filterLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  list: { paddingHorizontal: 20, paddingTop: 10 },
});
