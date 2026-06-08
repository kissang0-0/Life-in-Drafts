import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { DiaryCard } from '@/components/DiaryCard';
import { EmptyState } from '@/components/EmptyState';
import { FloatingButton } from '@/components/FloatingButton';
import { MOOD_OPTIONS } from '@/constants/nimbus';

export default function DiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const diary = useAppStore((s) => s.diary);
  const [search, setSearch] = useState('');
  const [filterMood, setFilterMood] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = diary.filter((e) => {
    const matchSearch =
      !search ||
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchMood = !filterMood || e.mood === filterMood;
    return matchSearch && matchMood;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.navy }]}>My Diary</Text>
        <Text style={[styles.count, { color: colors.textMuted }]}>
          {diary.length} {diary.length === 1 ? 'entry' : 'entries'}
        </Text>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

        {/* Mood filter */}
        <FlatList
          horizontal
          data={[{ key: '', label: 'All', icon: 'apps-outline' as const }, ...MOOD_OPTIONS]}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const isActive = filterMood === item.key;
            const mc = item.key ? colors.moodColors[item.key] ?? colors.surfaceAlt : colors.surfaceAlt;
            return (
              <TouchableOpacity
                onPress={() => setFilterMood(item.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? mc : colors.surface,
                    borderColor: isActive ? colors.navy + '40' : colors.border,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Ionicons name={item.icon as any} size={13} color={isActive ? colors.navy : colors.textMuted} />
                <Text style={[styles.filterLabel, { color: isActive ? colors.navy : colors.textMuted }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        renderItem={({ item }) => (
          <DiaryCard
            entry={item}
            onPress={() => router.push(`/diary/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="book-outline"
            title={search || filterMood ? 'No matching entries' : 'Your diary is empty'}
            subtitle={
              search || filterMood
                ? 'Try a different search or filter'
                : 'Write your first entry to begin your archive'
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FloatingButton onPress={() => router.push('/diary/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold' },
  count: { fontSize: 13, fontFamily: 'Nunito_400Regular', marginTop: -6 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filters: { gap: 8, paddingVertical: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  filterLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  list: { paddingHorizontal: 20, paddingTop: 8 },
});
