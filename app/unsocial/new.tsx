import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { addSocialPost } from '@/lib/firestore';
import { uploadPhoto } from '@/lib/storage';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import Toast from '@/components/Toast';

const POST_TYPES = [
  { key: 'text',        label: 'Just Vibes', emoji: '📝', color: '#7EC8E3', placeholder: "What's on your mind?" },
  { key: 'photo',       label: 'Photo Dump', emoji: '📸', color: '#C9AEED', placeholder: 'Add a caption…' },
  { key: 'mood',        label: 'Mood Check', emoji: '💭', color: '#FFCA6B', placeholder: 'Feeling something today…' },
  { key: 'life_update', label: 'Life Update', emoji: '🌟', color: '#98D4A3', placeholder: 'Something happened worth remembering…' },
  { key: 'rant',        label: 'Daily Rant', emoji: '🔥', color: '#FF8A80', placeholder: 'Let it all out. No judgment here.' },
  { key: 'thought',     label: 'Random Thought', emoji: '💡', color: '#B39DDB', placeholder: 'A thought just entered my head…' },
];

const CHAR_SOFT = 500;
const CHAR_HARD = 5000;

type ToastState = { visible: boolean; message: string; type: 'success' | 'error' | 'info' };

export default function NewSocialPost() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [postType, setPostType] = useState('text');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [location, setLocation] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const currentType = POST_TYPES.find(t => t.key === postType)!;
  const charCount = content.length;
  const isOverSoft = charCount > CHAR_SOFT;
  const isOverHard = charCount >= CHAR_HARD;

  const showToast = (msg: string, type: ToastState['type'] = 'success') =>
    setToast({ visible: true, message: msg, type });

  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85,
      allowsMultipleSelection: true, selectionLimit: 9,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 9));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag]);
    setTagInput('');
  };

  const handleSave = async (draft = false) => {
    if (!user || (!content.trim() && images.length === 0)) return;
    setSaving(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const uploaded: string[] = [];
      for (const uri of images) {
        try { uploaded.push(await uploadPhoto(user.uid, uri)); } catch {}
      }
      await addSocialPost(user.uid, {
        content: content.trim(),
        mood,
        images: uploaded,
        tags,
        postType,
        isLiked: false,
        isFavorite,
        isPinned: false,
        isArchived: false,
        isDraft: draft,
        location: location.trim(),
        reflections: [],
      });
      showToast(draft ? '📝 Draft saved!' : '🪐 Posted to your feed!');
      setTimeout(() => router.canGoBack() ? router.back() : router.replace('/(tabs)/unsocial'), 1000);
    } catch {
      showToast('Could not save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>New Post</Text>
        <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.iconBtn}>
          <Ionicons name={isFavorite ? 'bookmark' : 'bookmark-outline'} size={20} color={isFavorite ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSave(true)}
          style={[styles.draftBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          disabled={saving}
        >
          <Text style={[styles.draftBtnText, { color: colors.textMuted }]}>Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSave(false)}
          disabled={saving || (content.trim().length === 0 && images.length === 0)}
          style={[styles.postBtn, { backgroundColor: currentType.color, opacity: (content.trim().length === 0 && images.length === 0) ? 0.45 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.postBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Post type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          <View style={styles.typeRow}>
            {POST_TYPES.map(pt => {
              const sel = postType === pt.key;
              return (
                <TouchableOpacity
                  key={pt.key}
                  onPress={() => setPostType(pt.key)}
                  style={[styles.typeTab, { backgroundColor: sel ? pt.color : colors.surface, borderColor: sel ? pt.color : colors.border }]}
                >
                  <Text style={styles.typeTabEmoji}>{pt.emoji}</Text>
                  <Text style={[styles.typeTabLabel, { color: sel ? '#fff' : colors.textMuted }]}>{pt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Writing area */}
        <View style={[styles.writeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.contentInput, { color: colors.text }]}
            placeholder={currentType.placeholder}
            placeholderTextColor={colors.textMuted + '99'}
            value={content}
            onChangeText={t => setContent(t.slice(0, CHAR_HARD))}
            multiline
            textAlignVertical="top"
            autoFocus
          />
          {/* Char counter */}
          <View style={styles.counterRow}>
            <View style={[styles.counterBar, { backgroundColor: colors.border }]}>
              <View style={[
                styles.counterFill,
                { width: `${Math.min((charCount / CHAR_HARD) * 100, 100)}%` as any },
                { backgroundColor: isOverHard ? colors.error : isOverSoft ? '#FFB74D' : currentType.color },
              ]} />
            </View>
            <Text style={[styles.counterText, { color: isOverHard ? colors.error : isOverSoft ? '#E65100' : colors.textMuted }]}>
              {charCount}/{CHAR_HARD}
            </Text>
          </View>
        </View>

        {/* Mood picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Mood</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.moodRow}>
              {MOOD_OPTIONS.map(m => {
                const sel = mood === m.key;
                const mc = colors.moodColors?.[m.key] ?? colors.surfaceAlt;
                return (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setMood(sel ? '' : m.key)}
                    style={[styles.moodBtn, { backgroundColor: sel ? mc + '70' : 'transparent', borderColor: sel ? mc : colors.border }]}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    {sel && <Text style={[styles.moodBtnLabel, { color: colors.navy }]}>{m.label}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Images</Text>
          <View style={styles.imageRow}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity
                  onPress={() => setImages(p => p.filter((_, idx) => idx !== i))}
                  style={[styles.removeBtn, { backgroundColor: colors.error }]}
                >
                  <Ionicons name="close" size={11} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 9 && (
              <TouchableOpacity
                onPress={handlePickImages}
                style={[styles.addImageBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Ionicons name="images-outline" size={22} color={colors.textMuted} />
                <Text style={[styles.addImageLabel, { color: colors.textMuted }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tags</Text>
          <View style={[styles.tagInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.hashIcon, { color: colors.textMuted }]}>#</Text>
            <TextInput
              style={[styles.tagInput, { color: colors.text }]}
              placeholder="tag and press return…"
              placeholderTextColor={colors.textMuted + 'AA'}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              blurOnSubmit={false}
              returnKeyType="done"
              autoCapitalize="none"
            />
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsWrap}>
              {tags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setTags(p => p.filter(t => t !== tag))}
                  style={[styles.tagChip, { backgroundColor: colors.primary + '18' }]}
                >
                  <Text style={[styles.tagChipText, { color: colors.primary }]}>#{tag}</Text>
                  <Ionicons name="close" size={11} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={[styles.locationRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="Add location (optional)…"
              placeholderTextColor={colors.textMuted + 'AA'}
              value={location}
              onChangeText={setLocation}
            />
          </View>
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 6 },
  headerTitle: { flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  draftBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  draftBtnText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18 },
  postBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Nunito_700Bold' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, gap: 16 },

  // Type
  typeScroll: { marginHorizontal: -16 },
  typeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 2 },
  typeTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  typeTabEmoji: { fontSize: 14 },
  typeTabLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },

  // Writing
  writeCard: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  contentInput: { fontSize: 16, fontFamily: 'Nunito_400Regular', lineHeight: 26, minHeight: 160 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBar: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  counterFill: { height: '100%', borderRadius: 2 },
  counterText: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', minWidth: 60, textAlign: 'right' },

  // Section
  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },

  // Mood
  moodRow: { flexDirection: 'row', gap: 6 },
  moodBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, gap: 2 },
  moodEmoji: { fontSize: 22 },
  moodBtnLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },

  // Images
  imageRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  imageThumb: { width: 80, height: 80, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  addImageBtn: { width: 80, height: 80, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addImageLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },

  // Tags
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  hashIcon: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  tagInput: { flex: 1, fontSize: 14, fontFamily: 'Nunito_400Regular' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  // Location
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  locationInput: { flex: 1, fontSize: 14, fontFamily: 'Nunito_400Regular' },
});
