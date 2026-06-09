import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { updateSocialPost, deleteSocialPost, SocialPostReflection } from '@/lib/firestore';
import NimbusBird from '@/components/NimbusBird';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import Toast from '@/components/Toast';

const POST_TYPES: Record<string, { label: string; emoji: string; color: string }> = {
  text:        { label: 'Just Vibes',     emoji: '📝', color: '#7EC8E3' },
  photo:       { label: 'Photo Dump',     emoji: '📸', color: '#C9AEED' },
  mood:        { label: 'Mood Check',     emoji: '💭', color: '#FFCA6B' },
  life_update: { label: 'Life Update',    emoji: '🌟', color: '#98D4A3' },
  rant:        { label: 'Daily Rant',     emoji: '🔥', color: '#FF8A80' },
  thought:     { label: 'Random Thought', emoji: '💡', color: '#B39DDB' },
};

type ToastState = { visible: boolean; message: string; type: 'success' | 'error' | 'info' };

export default function SocialPostDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore(s => s.user);
  const socialPosts = useAppStore(s => s.socialPosts);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const post = useMemo(() => socialPosts.find(p => p.id === id), [socialPosts, id]);

  const [reflectionText, setReflectionText] = useState('');
  const [addingReflection, setAddingReflection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingImage, setViewingImage] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const showToast = (msg: string, type: ToastState['type'] = 'success') =>
    setToast({ visible: true, message: msg, type });

  if (!post) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <NimbusBird size={80} />
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Post not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const mood = MOOD_OPTIONS.find(m => m.key === post.mood);
  const pt = POST_TYPES[post.postType];

  const handleToggle = async (field: 'isLiked' | 'isFavorite' | 'isPinned' | 'isArchived') => {
    if (!user) return;
    await updateSocialPost(user.uid, post.id, { [field]: !post[field] });
    if (field === 'isPinned') showToast(post.isPinned ? '📌 Unpinned' : '📌 Pinned to top!');
    if (field === 'isArchived') showToast(post.isArchived ? '✅ Restored to feed' : '📦 Archived');
  };

  const handleAddReflection = async () => {
    if (!user || !reflectionText.trim()) return;
    setSaving(true);
    try {
      const newReflection: SocialPostReflection = {
        text: reflectionText.trim(),
        createdAt: new Date(),
      };
      const updated = [...post.reflections, newReflection];
      await updateSocialPost(user.uid, post.id, {
        reflections: updated.map(r => ({ text: r.text, createdAt: r.createdAt })),
      });
      setReflectionText('');
      setAddingReflection(false);
      showToast('✨ Reflection added!');
    } catch {
      showToast('Could not save reflection. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'This post will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            await deleteSocialPost(user.uid, post.id);
            router.canGoBack() ? router.back() : router.replace('/(tabs)/unsocial');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Post</Text>
        <TouchableOpacity onPress={() => handleToggle('isLiked')} style={styles.iconBtn}>
          <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={22} color={post.isLiked ? '#FF6B6B' : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleToggle('isFavorite')} style={styles.iconBtn}>
          <Ionicons name={post.isFavorite ? 'bookmark' : 'bookmark-outline'} size={22} color={post.isFavorite ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 + 40 : insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Post author row */}
        <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.authorRow}>
            <View style={styles.avatarWrap}>
              <NimbusBird size={44} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.navy }]}>you</Text>
              <Text style={[styles.postDate, { color: colors.textMuted }]}>
                {post.createdAt.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {'  ·  '}
                {post.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {pt && (
              <View style={[styles.typeBadge, { backgroundColor: pt.color + '25' }]}>
                <Text style={styles.typeBadgeEmoji}>{pt.emoji}</Text>
                <Text style={[styles.typeBadgeLabel, { color: pt.color }]}>{pt.label}</Text>
              </View>
            )}
          </View>

          {/* Content */}
          {!!post.content && (
            <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>
          )}

          {/* Images */}
          {post.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {post.images.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => setViewingImage(i)} style={styles.imageWrap}>
                  <Image source={{ uri }} style={styles.postImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Mood + tags */}
          {(mood || post.tags.length > 0 || post.location) && (
            <View style={styles.metaRow}>
              {mood && (
                <View style={[styles.moodBadge, { backgroundColor: (colors.moodColors?.[post.mood] ?? colors.surfaceAlt) + '55' }]}>
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: colors.navy }]}>{mood.label}</Text>
                </View>
              )}
              {post.location ? (
                <View style={[styles.locationBadge, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.locationText, { color: colors.textMuted }]}>{post.location}</Text>
                </View>
              ) : null}
              {post.tags.map(tag => (
                <Text key={tag} style={[styles.tag, { color: colors.primary }]}>#{tag}</Text>
              ))}
            </View>
          )}

          {/* Quick actions */}
          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={() => handleToggle('isPinned')} style={styles.actionBtn}>
              <Ionicons name={post.isPinned ? 'pin' : 'pin-outline'} size={18} color={post.isPinned ? colors.primary : colors.textMuted} />
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>{post.isPinned ? 'Pinned' : 'Pin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleToggle('isArchived')} style={styles.actionBtn}>
              <Ionicons name={post.isArchived ? 'archive' : 'archive-outline'} size={18} color={post.isArchived ? colors.accentDeep : colors.textMuted} />
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>{post.isArchived ? 'Archived' : 'Archive'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddingReflection(true)} style={styles.actionBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Reflect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reflections section */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>
              Reflections {post.reflections.length > 0 ? `(${post.reflections.length})` : ''}
            </Text>
            <TouchableOpacity onPress={() => setAddingReflection(!addingReflection)}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {addingReflection && (
            <View style={[styles.reflectCard, { backgroundColor: colors.surface, borderColor: colors.primary + '50' }]}>
              <View style={styles.reflectHeader}>
                <NimbusBird size={32} />
                <Text style={[styles.reflectDate, { color: colors.textMuted }]}>
                  {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <TextInput
                style={[styles.reflectInput, { color: colors.text }]}
                placeholder="Looking back at this moment…"
                placeholderTextColor={colors.textMuted + '99'}
                value={reflectionText}
                onChangeText={setReflectionText}
                multiline
                autoFocus
              />
              <View style={styles.reflectActions}>
                <TouchableOpacity
                  onPress={() => { setAddingReflection(false); setReflectionText(''); }}
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddReflection}
                  disabled={!reflectionText.trim() || saving}
                  style={[styles.saveReflectBtn, { backgroundColor: colors.primary, opacity: !reflectionText.trim() ? 0.45 : 1 }]}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveReflectBtnText}>Add Reflection</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {post.reflections.length === 0 && !addingReflection ? (
            <View style={[styles.noReflect, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={styles.noReflectEmoji}>💭</Text>
              <Text style={[styles.noReflectText, { color: colors.textMuted }]}>
                No reflections yet. Come back later and add what you think now.
              </Text>
            </View>
          ) : (
            [...post.reflections].reverse().map((r, i) => (
              <View key={i} style={[styles.reflectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.reflectHeader}>
                  <NimbusBird size={28} />
                  <Text style={[styles.reflectDate, { color: colors.textMuted }]}>
                    {r.createdAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.reflectText, { color: colors.text }]}>{r.text}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { padding: 6 },
  headerTitle: { flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Post card
  postCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  postDate: { fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  typeBadgeEmoji: { fontSize: 13 },
  typeBadgeLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  content: { fontSize: 17, fontFamily: 'Nunito_400Regular', lineHeight: 26, paddingHorizontal: 14, paddingBottom: 14 },
  imageScroll: { paddingLeft: 14, marginBottom: 12 },
  imageWrap: { marginRight: 10 },
  postImage: { width: 220, height: 220, borderRadius: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 14, paddingBottom: 14 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  moodEmoji: { fontSize: 15 },
  moodLabel: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  locationText: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  tag: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  actionsRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  actionLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  // Sections
  sectionBlock: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },

  // Reflection cards
  reflectCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  reflectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reflectDate: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  reflectInput: { fontSize: 15, fontFamily: 'Nunito_400Regular', lineHeight: 23, minHeight: 80 },
  reflectActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  saveReflectBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16 },
  saveReflectBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Nunito_700Bold' },
  reflectText: { fontSize: 15, fontFamily: 'Nunito_400Regular', lineHeight: 23 },
  noReflect: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8 },
  noReflectEmoji: { fontSize: 32 },
  noReflectText: { fontSize: 13, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 20 },

  // Not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 15, fontFamily: 'Nunito_400Regular' },
  backLink: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
});
