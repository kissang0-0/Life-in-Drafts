import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { addDiaryEntry } from '@/lib/firestore';
import { uploadPhoto } from '@/lib/storage';
import { MoodPicker } from '@/components/MoodPicker';
import Toast from '@/components/Toast';
import { AnimatedButton } from '@/components/AnimatedButton';

const WEATHER_OPTIONS = [
  { key: 'sunny',   emoji: '☀️', label: 'Sunny'   },
  { key: 'cloudy',  emoji: '⛅', label: 'Cloudy'  },
  { key: 'rainy',   emoji: '🌧️', label: 'Rainy'   },
  { key: 'snowy',   emoji: '❄️', label: 'Snowy'   },
  { key: 'foggy',   emoji: '🌫️', label: 'Foggy'   },
  { key: 'stormy',  emoji: '⛈️', label: 'Stormy'  },
  { key: 'windy',   emoji: '🌬️', label: 'Windy'   },
];

const ENERGY_LABELS = ['', '😴 Drained', '😞 Low', '😐 Okay', '🙂 Good', '⚡ Energized'];

const REFLECTION_PROMPTS = [
  { label: 'Happened today', text: 'What happened today?\n\n' },
  { label: 'I learned', text: 'What did I learn today?\n\n' },
  { label: 'Made me happy', text: 'What made me happy today?\n\n' },
  { label: 'Challenged me', text: 'What challenged me today?\n\n' },
  { label: 'Grateful for', text: 'I am grateful for...\n\n' },
  { label: 'Tomorrow', text: 'What do I want for tomorrow?\n\n' },
];

function isMidnightHours() {
  const h = new Date().getHours();
  return h >= 22 || h < 5;
}

type ToastState = { visible: boolean; message: string; type: 'success' | 'error' | 'info' };

export default function NewDiaryEntry() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isMidnight = useMemo(() => isMidnightHours(), []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [weather, setWeather] = useState('');
  const [energyLevel, setEnergyLevel] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const bg = isMidnight ? '#0F1923' : colors.background;
  const surface = isMidnight ? '#1A2639' : colors.surface;
  const textColor = isMidnight ? '#E8EFF7' : colors.text;
  const mutedColor = isMidnight ? '#8BA3BF' : colors.textMuted;
  const borderColor = isMidnight ? '#2A3F57' : colors.border;
  const accentColor = isMidnight ? '#7EC8E3' : colors.primary;

  const showToast = (message: string, type: ToastState['type'] = 'success') =>
    setToast({ visible: true, message, type });

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
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setTagInput('');
  };

  const insertPrompt = (text: string) => {
    setContent((prev) => prev + (prev && !prev.endsWith('\n') ? '\n\n' : '') + text);
    setShowPrompts(false);
  };

  const handleSave = async () => {
    if (!content.trim() || !user) return;
    setSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      const uploadedPhotos: string[] = [];
      for (const uri of photos) {
        try {
          const url = await uploadPhoto(user.uid, uri);
          uploadedPhotos.push(url);
        } catch {}
      }
      await addDiaryEntry(user.uid, {
        title: title.trim(),
        content: content.trim(),
        mood,
        tags,
        photos: uploadedPhotos,
        weather,
        energyLevel,
      });
      showToast('✨ Entry saved to your archive!', 'success');
      setTimeout(() => router.back(), 1200);
    } catch {
      showToast('Could not save your entry. Please try again.', 'error');
      setSaving(false);
    }
  };

  const saveBtn = (
    <AnimatedButton
      onPress={handleSave}
      disabled={saving || !content.trim()}
      style={[styles.saveBtn, { backgroundColor: accentColor, opacity: !content.trim() ? 0.5 : 1 }]}
    >
      {saving
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.saveBtnText}>Save</Text>}
    </AnimatedButton>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      {isMidnight ? (
        <LinearGradient
          colors={['#0A1628', '#0F1923']}
          style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: borderColor }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={mutedColor} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.moonEmoji}>🌙</Text>
            <Text style={[styles.headerTitle, { color: '#E8EFF7' }]}>Midnight Thoughts</Text>
          </View>
          {saveBtn}
        </LinearGradient>
      ) : (
        <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: surface, borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={mutedColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.navy }]}>New Entry</Text>
          {saveBtn}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Date + time */}
        <Text style={[styles.dateLabel, { color: mutedColor }]}>
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          {' · '}
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Weather + Energy row */}
        <View style={styles.metaRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.weatherRow}>
              {WEATHER_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w.key}
                  onPress={() => setWeather(weather === w.key ? '' : w.key)}
                  style={[
                    styles.weatherChip,
                    {
                      backgroundColor: weather === w.key ? accentColor + '30' : 'transparent',
                      borderColor: weather === w.key ? accentColor : borderColor,
                    },
                  ]}
                >
                  <Text style={styles.weatherEmoji}>{w.emoji}</Text>
                  {weather === w.key && (
                    <Text style={[styles.weatherLabel, { color: accentColor }]}>{w.label}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Energy level */}
        <View style={styles.energyRow}>
          <Text style={[styles.energyHint, { color: mutedColor }]}>Energy</Text>
          <View style={styles.energyDots}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                onPress={() => setEnergyLevel(energyLevel === lvl ? 0 : lvl)}
                style={[
                  styles.energyDot,
                  {
                    backgroundColor: lvl <= energyLevel ? accentColor : borderColor,
                    transform: [{ scale: lvl <= energyLevel ? 1.1 : 1 }],
                  },
                ]}
              />
            ))}
          </View>
          {energyLevel > 0 && (
            <Text style={[styles.energyLabel, { color: mutedColor }]}>{ENERGY_LABELS[energyLevel]}</Text>
          )}
        </View>

        {/* Mood */}
        <View style={[styles.moodSection, { marginHorizontal: -20 }]}>
          <Text style={[styles.label, { color: mutedColor, paddingHorizontal: 20 }]}>How are you feeling?</Text>
          <MoodPicker selected={mood} onSelect={setMood} />
        </View>

        {/* Title */}
        <TextInput
          style={[styles.titleInput, { color: isMidnight ? '#E8EFF7' : colors.navy, fontFamily: 'Nunito_700Bold' }]}
          placeholder="Give it a title (optional)"
          placeholderTextColor={mutedColor}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Reflection prompts */}
        <View style={styles.promptsSection}>
          <TouchableOpacity
            onPress={() => setShowPrompts(!showPrompts)}
            style={[styles.promptsToggle, { borderColor }]}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles-outline" size={15} color={mutedColor} />
            <Text style={[styles.promptsToggleText, { color: mutedColor }]}>Reflection prompts</Text>
            <Ionicons name={showPrompts ? 'chevron-up' : 'chevron-down'} size={14} color={mutedColor} />
          </TouchableOpacity>
          {showPrompts && (
            <View style={styles.promptsGrid}>
              {REFLECTION_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => insertPrompt(p.text)}
                  style={[styles.promptChip, { backgroundColor: accentColor + '18', borderColor: accentColor + '30' }]}
                >
                  <Text style={[styles.promptChipText, { color: accentColor }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <TextInput
          style={[styles.contentInput, { color: textColor, fontFamily: 'Nunito_400Regular' }]}
          placeholder={isMidnight
            ? "The quiet hours are yours. Write what the day left behind..."
            : "Write what's on your mind... This space is yours."}
          placeholderTextColor={mutedColor}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        {/* Tags */}
        <View style={styles.tagsSection}>
          <View style={[styles.tagInputRow, { borderColor }]}>
            <Ionicons name="pricetag-outline" size={16} color={mutedColor} />
            <TextInput
              style={[styles.tagInput, { color: textColor, fontFamily: 'Nunito_400Regular' }]}
              placeholder="Add a tag..."
              placeholderTextColor={mutedColor}
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
                  style={[styles.tagChip, { backgroundColor: accentColor + '20' }]}
                >
                  <Text style={[styles.tagChipText, { color: accentColor }]}>#{tag}</Text>
                  <Ionicons name="close" size={12} color={accentColor} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Photos */}
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
              style={[styles.addPhoto, { backgroundColor: surface, borderColor }]}
            >
              <Ionicons name="camera-outline" size={22} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>

        {isMidnight && (
          <Text style={styles.midnightFooter}>🌙 Midnight Thoughts · Only you can see this</Text>
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  moonEmoji: { fontSize: 16 },
  closeBtn: { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  dateLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  weatherRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  weatherChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
  },
  weatherEmoji: { fontSize: 16 },
  weatherLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  energyHint: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  energyDots: { flexDirection: 'row', gap: 8 },
  energyDot: { width: 12, height: 12, borderRadius: 6 },
  energyLabel: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  moodSection: { gap: 8 },
  label: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  titleInput: { fontSize: 22, lineHeight: 28, paddingVertical: 4 },
  promptsSection: { gap: 8 },
  promptsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  promptsToggleText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  promptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  promptChipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  contentInput: { fontSize: 16, lineHeight: 26, minHeight: 180 },
  tagsSection: { gap: 8 },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, paddingBottom: 8,
  },
  tagInput: { flex: 1, fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
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
  midnightFooter: {
    fontSize: 12, fontFamily: 'Nunito_400Regular', color: '#4A6B8A',
    textAlign: 'center', marginTop: 8,
  },
});
