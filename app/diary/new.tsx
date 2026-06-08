import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { addDiaryEntry } from '@/lib/firestore';
import { uploadPhoto } from '@/lib/storage';
import { MoodPicker } from '@/components/MoodPicker';

export default function NewDiaryEntry() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput('');
  };

  const handleSave = async () => {
    if (!content.trim() || !user) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const uploadedPhotos: string[] = [];
      for (const uri of photos) {
        try {
          const url = await uploadPhoto(user.uid, uri);
          uploadedPhotos.push(url);
        } catch {
          // skip failed uploads
        }
      }

      await addDiaryEntry(user.uid, {
        title: title.trim(),
        content: content.trim(),
        mood,
        tags,
        photos: uploadedPhotos,
      });

      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save your entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>New Entry</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !content.trim()}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !content.trim() ? 0.5 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>

        {/* Mood */}
        <View style={styles.moodSection}>
          <Text style={[styles.label, { color: colors.text }]}>How are you feeling?</Text>
          <MoodPicker selected={mood} onSelect={setMood} />
        </View>

        {/* Title */}
        <TextInput
          style={[styles.titleInput, { color: colors.navy, fontFamily: 'Nunito_700Bold' }]}
          placeholder="Give it a title (optional)"
          placeholderTextColor={colors.textLight}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Content */}
        <TextInput
          style={[styles.contentInput, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
          placeholder="Write what's on your mind... This space is yours."
          placeholderTextColor={colors.textLight}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        {/* Tags */}
        <View style={styles.tagsSection}>
          <View style={styles.tagInputRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.tagInput, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
              placeholder="Add a tag..."
              placeholderTextColor={colors.textLight}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              blurOnSubmit={false}
              returnKeyType="done"
              autoCapitalize="none"
            />
          </View>
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  style={[styles.tagChip, { backgroundColor: colors.primary + '20' }]}
                >
                  <Text style={[styles.tagChipText, { color: colors.primary }]}>#{tag}</Text>
                  <Ionicons name="close" size={12} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Photos */}
        <View style={styles.photosSection}>
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImg} />
                <TouchableOpacity
                  onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  style={[styles.photoRemove, { backgroundColor: colors.error }]}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 4 && (
              <TouchableOpacity
                onPress={handlePickPhoto}
                style={[styles.addPhoto, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: Platform.OS === 'web' ? 34 : 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  dateLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  moodSection: { gap: 8, marginHorizontal: -20 },
  label: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', paddingHorizontal: 20 },
  titleInput: { fontSize: 22, lineHeight: 28, borderBottomWidth: 0, paddingVertical: 4 },
  contentInput: { fontSize: 16, lineHeight: 24, minHeight: 200 },
  tagsSection: { gap: 8 },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderColor: '#D4EAF7', paddingBottom: 8,
  },
  tagInput: { flex: 1, fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  tagChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  photosSection: {},
  photoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  addPhoto: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
});
