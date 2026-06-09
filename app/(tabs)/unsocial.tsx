import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, TextInput, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { SocialPost, updateSocialPost } from '@/lib/firestore';
import NimbusBird from '@/components/NimbusBird';
import { MOOD_OPTIONS } from '@/constants/nimbus';

const POST_TYPES = [
  { key: 'text',        label: 'Vibes',      emoji: '📝', color: '#7EC8E3' },
  { key: 'photo',       label: 'Photos',     emoji: '📸', color: '#C9AEED' },
  { key: 'mood',        label: 'Mood',       emoji: '💭', color: '#FFCA6B' },
  { key: 'life_update', label: 'Life',       emoji: '🌟', color: '#98D4A3' },
  { key: 'rant',        label: 'Rant',       emoji: '🔥', color: '#FF8A80' },
  { key: 'thought',     label: 'Thought',    emoji: '💡', color: '#B39DDB' },
];

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

type PostCardProps = {
  post: SocialPost;
  onPress: () => void;
  onLike: () => void;
  onFavorite: () => void;
};

function PostCard({ post, onPress, onLike, onFavorite }: PostCardProps) {
  const colors = useColors();
  const mood = MOOD_OPTIONS.find(m => m.key === post.mood);
  const pt = POST_TYPES.find(t => t.key === post.postType);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}
    >
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <NimbusBird size={36} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.navy }]}>you</Text>
          <Text style={[styles.cardTime, { color: colors.textMuted }]}>{timeAgo(post.createdAt)}</Text>
        </View>
        {pt && (
          <View style={[styles.typeBadge, { backgroundColor: pt.color + '25' }]}>
            <Text style={styles.typeBadgeEmoji}>{pt.emoji}</Text>
            <Text style={[styles.typeBadgeLabel, { color: pt.color }]}>{pt.label}</Text>
          </View>
        )}
        {post.isPinned && (
          <Ionicons name="pin" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        )}
      </View>

      {/* Content */}
      {!!post.content && (
        <Text
          style={[styles.cardContent, { color: colors.text }]}
          numberOfLines={6}
        >
          {post.content}
        </Text>
      )}

      {/* Images */}
      {post.images.length > 0 && (
        <View style={styles.imageGrid}>
          {post.images.slice(0, 3).map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={[
                styles.gridImage,
                post.images.length === 1 && styles.gridImageSingle,
                post.images.length === 2 && styles.gridImageHalf,
              ]}
            />
          ))}
          {post.images.length > 3 && (
            <View style={[styles.moreImages, { backgroundColor: colors.navy + 'CC' }]}>
              <Text style={styles.moreImagesText}>+{post.images.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Mood + tags row */}
      {(mood || post.tags.length > 0) && (
        <View style={styles.metaRow}>
          {mood && (
            <View style={[styles.moodPill, { backgroundColor: (colors.moodColors?.[post.mood] ?? colors.surfaceAlt) + '55' }]}>
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, { color: colors.navy }]}>{mood.label}</Text>
            </View>
          )}
          {post.tags.slice(0, 3).map(tag => (
            <Text key={tag} style={[styles.tag, { color: colors.primary }]}>#{tag}</Text>
          ))}
        </View>
      )}

      {/* Reflections hint */}
      {post.reflections.length > 0 && (
        <View style={[styles.reflectionHint, { borderTopColor: colors.border }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.reflectionHintText, { color: colors.textMuted }]}>
            {post.reflections.length} reflection{post.reflections.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={onLike} style={styles.actionBtn}>
          <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={20} color={post.isLiked ? '#FF6B6B' : colors.textMuted} />
          <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onFavorite} style={styles.actionBtn}>
          <Ionicons name={post.isFavorite ? 'bookmark' : 'bookmark-outline'} size={20} color={post.isFavorite ? colors.primary : colors.textMuted} />
          <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Reflect</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function UnsocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const socialPosts = useAppStore(s => s.socialPosts);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterMood, setFilterMood] = useState('');
  const [filterLiked, setFilterLiked] = useState(false);
  const [filterFaved, setFilterFaved] = useState(false);

  const handleLike = async (post: SocialPost) => {
    if (!user) return;
    await updateSocialPost(user.uid, post.id, { isLiked: !post.isLiked });
  };

  const handleFavorite = async (post: SocialPost) => {
    if (!user) return;
    await updateSocialPost(user.uid, post.id, { isFavorite: !post.isFavorite });
  };

  const visible = useMemo(() => {
    let posts = socialPosts.filter(p => !p.isArchived && !p.isDraft);
    if (filterType !== 'all') posts = posts.filter(p => p.postType === filterType);
    if (filterMood) posts = posts.filter(p => p.mood === filterMood);
    if (filterLiked) posts = posts.filter(p => p.isLiked);
    if (filterFaved) posts = posts.filter(p => p.isFavorite);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(p =>
        p.content.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q))
      );
    }
    const pinned = posts.filter(p => p.isPinned);
    const rest = posts.filter(p => !p.isPinned);
    return [...pinned, ...rest];
  }, [socialPosts, filterType, filterMood, filterLiked, filterFaved, searchQuery]);

  const isEmpty = socialPosts.filter(p => !p.isArchived && !p.isDraft).length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {showSearch ? (
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
              placeholder="Search posts or tags…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.navy }]}>Unsocial Me-dia 🪐</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setShowSearch(true)} style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => { setFilterLiked(!filterLiked); setFilterFaved(false); }}
              style={[styles.filterChip, { backgroundColor: filterLiked ? '#FF6B6B20' : colors.surfaceAlt, borderColor: filterLiked ? '#FF6B6B' : colors.border }]}
            >
              <Text style={styles.filterChipEmoji}>❤️</Text>
              <Text style={[styles.filterChipLabel, { color: filterLiked ? '#FF6B6B' : colors.textMuted }]}>Liked</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setFilterFaved(!filterFaved); setFilterLiked(false); }}
              style={[styles.filterChip, { backgroundColor: filterFaved ? colors.primary + '20' : colors.surfaceAlt, borderColor: filterFaved ? colors.primary : colors.border }]}
            >
              <Text style={styles.filterChipEmoji}>🔖</Text>
              <Text style={[styles.filterChipLabel, { color: filterFaved ? colors.primary : colors.textMuted }]}>Saved</Text>
            </TouchableOpacity>
            {POST_TYPES.map(pt => (
              <TouchableOpacity
                key={pt.key}
                onPress={() => setFilterType(filterType === pt.key ? 'all' : pt.key)}
                style={[styles.filterChip, { backgroundColor: filterType === pt.key ? pt.color + '25' : colors.surfaceAlt, borderColor: filterType === pt.key ? pt.color : colors.border }]}
              >
                <Text style={styles.filterChipEmoji}>{pt.emoji}</Text>
                <Text style={[styles.filterChipLabel, { color: filterType === pt.key ? pt.color : colors.textMuted }]}>{pt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Feed */}
      {isEmpty ? (
        <View style={styles.empty}>
          <NimbusBird size={110} />
          <Text style={[styles.nimbusLabel, { color: colors.primary }]}>✦ Nimbus</Text>
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>Your story starts with a single post.</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>This is your private space — rant, celebrate, remember.</Text>
          <TouchableOpacity
            onPress={() => router.push('/unsocial/new' as any)}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Create First Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => router.push(`/unsocial/${item.id}` as any)}
              onLike={() => handleLike(item)}
              onFavorite={() => handleFavorite(item)}
            />
          )}
          contentContainerStyle={[
            styles.feed,
            { paddingBottom: Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.textMuted }]}>No posts match your filters.</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {!isEmpty && (
        <TouchableOpacity
          onPress={() => router.push('/unsocial/new' as any)}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: -2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  filterScroll: { paddingLeft: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
  },
  filterChipEmoji: { fontSize: 13 },
  filterChipLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  // Feed
  feed: { paddingHorizontal: 14, paddingTop: 12, gap: 14 },

  // Card
  card: {
    borderRadius: 22, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  cardTime: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  typeBadgeEmoji: { fontSize: 12 },
  typeBadgeLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  cardContent: { fontSize: 15, fontFamily: 'Nunito_400Regular', lineHeight: 23, paddingHorizontal: 14, paddingBottom: 12 },

  // Image grid
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginBottom: 12, paddingHorizontal: 14, position: 'relative' },
  gridImage: { width: 100, height: 100, borderRadius: 10 },
  gridImageSingle: { width: '100%', height: 220, borderRadius: 14 },
  gridImageHalf: { flex: 1, height: 140 },
  moreImages: {
    position: 'absolute', right: 14, bottom: 0,
    width: 100, height: 100, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  moreImagesText: { color: '#fff', fontSize: 18, fontFamily: 'Nunito_700Bold' },

  // Meta
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  moodPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  moodEmoji: { fontSize: 14 },
  moodLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  tag: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  // Reflection hint
  reflectionHint: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  reflectionHintText: { fontSize: 12, fontFamily: 'Nunito_400Regular' },

  // Actions
  cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  actionLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  nimbusLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  emptyTitle: { fontSize: 20, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 21 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 22, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },
  noResults: { alignItems: 'center', paddingVertical: 40 },
  noResultsText: { fontSize: 14, fontFamily: 'Nunito_400Regular' },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 100,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
});
