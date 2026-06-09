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
import { ENTRY_TYPES } from '@/constants/nimbus';

const WEATHER_OPTIONS = [
  { key: 'sunny',  emoji: '☀️' },
  { key: 'cloudy', emoji: '⛅' },
  { key: 'rainy',  emoji: '🌧️' },
  { key: 'snowy',  emoji: '❄️' },
  { key: 'foggy',  emoji: '🌫️' },
  { key: 'stormy', emoji: '⛈️' },
  { key: 'night',  emoji: '🌙' },
  { key: 'windy',  emoji: '🌬️' },
];

const ENERGY_LEVELS = [
  { value: 1, emoji: '🪫', label: 'Very Low'  },
  { value: 2, emoji: '🔋', label: 'Low'       },
  { value: 3, emoji: '⚡', label: 'Medium'    },
  { value: 4, emoji: '✨', label: 'High'      },
  { value: 5, emoji: '🌟', label: 'Very High' },
];

const REFLECTION_PROMPTS = [
  { label: 'What happened today?',               text: 'What happened today?\n\n'             },
  { label: 'What made me smile?',                text: 'What made me smile?\n\n'              },
  { label: 'What challenged me?',                text: 'What challenged me today?\n\n'        },
  { label: 'What did I learn?',                  text: 'What did I learn today?\n\n'          },
  { label: 'What am I grateful for?',            text: 'I am grateful for...\n\n'             },
  { label: 'What do I want tomorrow to look like?', text: 'What do I want for tomorrow?\n\n' },
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

  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [mood, setMood]             = useState('');
  const [weather, setWeather]       = useState('');
  const [energyLevel, setEnergy]    = useState(0);
  const [tags, setTags]             = useState<string[]>([]);
  const [tagInput, setTagInput]     = useState('');
  const [photos, setPhotos]         = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [entryType, setEntryType]   = useState('normal');
  const [toast, setToast]           = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // Theme tokens
  const bg        = isMidnight ? '#0C1420' : colors.background;
  const cardBg    = isMidnight ? '#162030' : '#FFFFFF';
  const textColor = isMidnight ? '#E8EFF7' : colors.text;
  const mutedColor= isMidnight ? '#6E8FAD' : colors.textMuted;
  const border    = isMidnight ? '#1E3048' : '#E8EEF4';
  const accent    = isMidnight ? '#7EC8E3' : colors.primary;
  const navy      = isMidnight ? '#E8EFF7' : colors.navy;

  const now = new Date();
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const showToast = (msg: string, type: ToastState['type'] = 'success') =>
    setToast({ visible: true, message: msg, type });

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 6,
    });
    if (!result.canceled) {
      setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 6));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag]);
    setTagInput('');
  };

  const insertPrompt = (text: string) => {
    setContent(prev => prev + (prev && !prev.endsWith('\n') ? '\n\n' : '') + text);
    setShowPrompts(false);
  };

  const handleSave = async () => {
    if (!content.trim() || !user) return;
    setSaving(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const uploadedPhotos: string[] = [];
      for (const uri of photos) {
        try { uploadedPhotos.push(await uploadPhoto(user.uid, uri)); } catch {}
      }
      await addDiaryEntry(user.uid, {
        title: title.trim(), content: content.trim(),
        mood, tags, photos: uploadedPhotos,
        weather, energyLevel, isFavorite, entryType,
      });
      showToast('✨ Entry saved to your archive!');
      setTimeout(() => router.back(), 1200);
    } catch {
      showToast('Could not save. Please try again.', 'error');
      setSaving(false);
    }
  };

  const currentType = ENTRY_TYPES.find(t => t.key === entryType);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* ── Slim header ── */}
      {isMidnight ? (
        <LinearGradient
          colors={['#080E1A', '#0C1420']}
          style={[styles.header, { paddingTop: topPad + 8 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={22} color={mutedColor} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.midnightDot}>🌙</Text>
            <Text style={[styles.headerLabel, { color: '#E8EFF7' }]}>Midnight Thoughts</Text>
          </View>
          <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.iconBtn}>
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={20} color={isFavorite ? '#FFD700' : mutedColor} />
          </TouchableOpacity>
          <AnimatedButton
            onPress={handleSave}
            disabled={saving || !content.trim()}
            style={[styles.saveBtn, { backgroundColor: accent, opacity: !content.trim() ? 0.45 : 1 }]}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveTxt}>Save</Text>}
          </AnimatedButton>
        </LinearGradient>
      ) : (
        <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: '#FFFFFF', borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={22} color={mutedColor} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={[styles.headerLabel, { color: navy }]}>New Entry</Text>
          </View>
          <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.iconBtn}>
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={20} color={isFavorite ? '#FFD700' : mutedColor} />
          </TouchableOpacity>
          <AnimatedButton
            onPress={handleSave}
            disabled={saving || !content.trim()}
            style={[styles.saveBtn, { backgroundColor: accent, opacity: !content.trim() ? 0.45 : 1 }]}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveTxt}>Save</Text>}
          </AnimatedButton>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Date pill + entry type tabs ── */}
        <View style={styles.topMeta}>
          <View style={[styles.datePill, { backgroundColor: accent + '18' }]}>
            <Ionicons name="calendar-outline" size={12} color={accent} />
            <Text style={[styles.datePillText, { color: accent }]}>{dateStr} · {timeStr}</Text>
          </View>
        </View>

        {/* ── Entry type ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
          <View style={styles.typesRow}>
            {ENTRY_TYPES.map(type => {
              const sel = entryType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setEntryType(type.key)}
                  style={[
                    styles.typeTab,
                    sel
                      ? { backgroundColor: accent, borderColor: accent }
                      : { backgroundColor: cardBg, borderColor: border },
                  ]}
                >
                  <Text style={styles.typeTabEmoji}>{type.emoji}</Text>
                  <Text style={[styles.typeTabLabel, { color: sel ? '#fff' : mutedColor }]}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── Writing card ── */}
        <View style={[styles.writingCard, { backgroundColor: cardBg, borderColor: border }]}>
          {/* Title */}
          <TextInput
            style={[styles.titleInput, { color: navy, borderBottomColor: border }]}
            placeholder="Title your entry…"
            placeholderTextColor={mutedColor + 'AA'}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* Prompts toggle */}
          <TouchableOpacity
            onPress={() => setShowPrompts(!showPrompts)}
            style={[styles.promptsToggle, { borderColor: accent + '40' }]}
            activeOpacity={0.7}
          >
            <Text style={styles.promptsStar}>✨</Text>
            <Text style={[styles.promptsLabel, { color: accent }]}>Need a prompt?</Text>
            <Ionicons name={showPrompts ? 'chevron-up' : 'chevron-forward'} size={13} color={accent} />
          </TouchableOpacity>

          {showPrompts && (
            <View style={styles.promptsGrid}>
              {REFLECTION_PROMPTS.map(p => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => insertPrompt(p.text)}
                  style={[styles.promptChip, { backgroundColor: accent + '12', borderColor: accent + '30' }]}
                >
                  <Text style={[styles.promptChipText, { color: accent }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Body */}
          <TextInput
            style={[styles.bodyInput, { color: textColor }]}
            placeholder={isMidnight
              ? 'The quiet hours are yours. Write what the day left behind…'
              : 'Write freely. This is your space. 💙'}
            placeholderTextColor={mutedColor + '99'}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>

        {/* ── Mood ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>How are you feeling?</Text>
          <View style={[{ marginHorizontal: -20 }]}>
            <MoodPicker selected={mood} onSelect={setMood} />
          </View>
        </View>

        {/* ── Context card: weather + energy ── */}
        <View style={[styles.contextCard, { backgroundColor: cardBg, borderColor: border }]}>
          {/* Weather row */}
          <View style={styles.contextSection}>
            <View style={styles.contextLabelRow}>
              <Text style={styles.contextIcon}>🌤</Text>
              <Text style={[styles.contextLabel, { color: mutedColor }]}>Weather</Text>
            </View>
            <View style={styles.emojiRow}>
              {WEATHER_OPTIONS.map(w => (
                <TouchableOpacity
                  key={w.key}
                  onPress={() => setWeather(weather === w.key ? '' : w.key)}
                  style={[
                    styles.emojiBtn,
                    weather === w.key && { backgroundColor: accent + '25', borderColor: accent },
                    { borderColor: weather === w.key ? accent : 'transparent' },
                  ]}
                >
                  <Text style={styles.emojiBtnText}>{w.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.contextDivider, { backgroundColor: border }]} />

          {/* Energy row */}
          <View style={styles.contextSection}>
            <View style={styles.contextLabelRow}>
              <Text style={styles.contextIcon}>⚡</Text>
              <Text style={[styles.contextLabel, { color: mutedColor }]}>Energy</Text>
              {energyLevel > 0 && (
                <Text style={[styles.energySelected, { color: accent }]}>
                  · {ENERGY_LEVELS[energyLevel - 1].label}
                </Text>
              )}
            </View>
            <View style={styles.emojiRow}>
              {ENERGY_LEVELS.map(lvl => (
                <TouchableOpacity
                  key={lvl.value}
                  onPress={() => setEnergy(energyLevel === lvl.value ? 0 : lvl.value)}
                  style={[
                    styles.emojiBtn,
                    energyLevel === lvl.value && { backgroundColor: accent + '25', borderColor: accent },
                    { borderColor: energyLevel === lvl.value ? accent : 'transparent' },
                  ]}
                >
                  <Text style={styles.emojiBtnText}>{lvl.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Photos ── */}
        {(photos.length > 0 || true) && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: mutedColor }]}>Photos</Text>
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    style={[styles.photoRemove, { backgroundColor: colors.error }]}
                  >
                    <Ionicons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 6 && (
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  style={[styles.addPhotoBtn, { backgroundColor: cardBg, borderColor: border }]}
                >
                  <Ionicons name="images-outline" size={20} color={mutedColor} />
                  <Text style={[styles.addPhotoTxt, { color: mutedColor }]}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Tags ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>Tags</Text>
          <View style={[styles.tagInputRow, { backgroundColor: cardBg, borderColor: border }]}>
            <Ionicons name="pricetag-outline" size={14} color={mutedColor} />
            <TextInput
              style={[styles.tagTextInput, { color: textColor }]}
              placeholder="Add a tag…"
              placeholderTextColor={mutedColor + 'AA'}
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
                  onPress={() => setTags(prev => prev.filter(t => t !== tag))}
                  style={[styles.tagChip, { backgroundColor: accent + '18' }]}
                >
                  <Text style={[styles.tagChipText, { color: accent }]}>#{tag}</Text>
                  <Ionicons name="close" size={11} color={accent} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {isMidnight && (
          <Text style={styles.midnightNote}>🌙 Midnight Thoughts · just between you and the page</Text>
        )}
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

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  iconBtn: { padding: 6 },
  headerMid: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  midnightDot: { fontSize: 14 },
  headerLabel: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  saveTxt: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 13 },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },

  /* Top meta */
  topMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  datePillText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  /* Entry type tabs */
  typesScroll: { marginHorizontal: -16 },
  typesRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingVertical: 2 },
  typeTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  typeTabEmoji: { fontSize: 13 },
  typeTabLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },

  /* Writing card */
  writingCard: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  titleInput: {
    fontSize: 20, fontFamily: 'Nunito_700Bold',
    paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  promptsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderRadius: 20,
  },
  promptsStar: { fontSize: 12 },
  promptsLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  promptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  promptChip: {
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1,
  },
  promptChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  bodyInput: {
    fontSize: 16, fontFamily: 'Nunito_400Regular',
    lineHeight: 26, minHeight: 180,
    paddingTop: 4,
  },

  /* Section headings */
  sectionBlock: { gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },

  /* Context card (weather + energy) */
  contextCard: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, gap: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  contextSection: { paddingVertical: 8, gap: 8 },
  contextDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 0 },
  contextLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contextIcon: { fontSize: 13 },
  contextLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  energySelected: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  emojiRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  emojiBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  emojiBtnText: { fontSize: 20 },

  /* Photos */
  photoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoThumb: { width: 76, height: 76, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 76, height: 76, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  addPhotoTxt: { fontSize: 10, fontFamily: 'Nunito_600SemiBold' },

  /* Tags */
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  tagTextInput: { flex: 1, fontSize: 14, fontFamily: 'Nunito_400Regular' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  tagChipText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  /* Midnight */
  midnightNote: {
    fontSize: 12, fontFamily: 'Nunito_400Regular', color: '#3A5A7A',
    textAlign: 'center', paddingTop: 4,
  },
});
