import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { deleteDiaryEntry, updateDiaryEntry, addStar, deleteStar, getStarTypeFromMood } from '@/lib/firestore';
import { MOOD_OPTIONS, ENTRY_TYPES } from '@/constants/nimbus';
import { MOOD_FLOWERS } from '@/constants/quotes';
import { format } from '@/lib/dateUtils';

const WEATHER_MAP: Record<string, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  snowy: '❄️',
  foggy: '🌫️',
  stormy: '⛈️',
  night: '🌙',
  windy: '🌬️',
};

const ENERGY_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: 'Very Low',  emoji: '🪫' },
  2: { label: 'Low',       emoji: '🔋' },
  3: { label: 'Medium',    emoji: '⚡' },
  4: { label: 'High',      emoji: '✨' },
  5: { label: 'Very High', emoji: '🌟' },
};

export default function DiaryEntryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const diary = useAppStore((s) => s.diary);
  const stars = useAppStore((s) => s.stars);

  const entry = diary.find((e) => e.id === id);
  const [isFavorite, setIsFavorite] = useState(entry?.isFavorite ?? false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [toggingStar, setTogglingStar] = useState(false);

  const existingStar = stars.find((s) => s.sourceId === id);
  const isStarred = !!existingStar;

  const mood = entry ? MOOD_OPTIONS.find((m) => m.key === entry.mood) : null;
  const moodColor = entry?.mood ? colors.moodColors[entry.mood] ?? colors.surfaceAlt : colors.surfaceAlt;
  const flower = entry?.mood ? MOOD_FLOWERS[entry.mood] : null;
  const entryType = entry?.entryType ? ENTRY_TYPES.find((t) => t.key === entry.entryType) : null;
  const energyInfo = entry?.energyLevel ? ENERGY_LABELS[entry.energyLevel] : null;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'This will permanently delete this diary entry.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (user && id) {
            await deleteDiaryEntry(user.uid, id);
            router.canGoBack() ? router.back() : router.replace('/(tabs)/home');
          }
        },
      },
    ]);
  };

  const handleToggleFavorite = async () => {
    if (!user || !id || togglingFav) return;
    setTogglingFav(true);
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    try {
      await updateDiaryEntry(user.uid, id, { isFavorite: newVal });
    } catch {
      setIsFavorite(!newVal);
    } finally {
      setTogglingFav(false);
    }
  };

  const handleToggleStar = async () => {
    if (!user || !entry || toggingStar) return;
    setTogglingStar(true);
    try {
      if (existingStar) {
        await deleteStar(user.uid, existingStar.id);
      } else {
        await addStar(user.uid, {
          type: getStarTypeFromMood(entry.mood),
          title: entry.title || entry.content.slice(0, 60),
          content: entry.content,
          sourceType: 'diary',
          sourceId: entry.id,
          mood: entry.mood,
          tags: entry.tags,
        });
      }
    } finally {
      setTogglingStar(false);
    }
  };

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.notFound, { color: colors.textMuted }]}>Entry not found</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/diary' as any)} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/diary' as any)} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleToggleStar} style={[styles.navBtn, styles.starBtnWrap]} disabled={toggingStar}>
          <Ionicons name={isStarred ? 'sparkles' : 'sparkles-outline'} size={20} color={isStarred ? '#8ECFFF' : colors.textMuted} />
          <Text style={[styles.starBtnLabel, { color: isStarred ? '#8ECFFF' : colors.textMuted }]}>
            {isStarred ? 'Starred' : 'Star'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleFavorite} style={styles.navBtn}>
          <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={22} color={isFavorite ? '#FFD700' : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.navBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === 'web' ? 34 + 40 : insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood banner */}
        {mood && (
          <LinearGradient
            colors={[moodColor, moodColor + '88']}
            style={styles.moodBanner}
          >
            <Text style={styles.moodBannerEmoji}>{mood.emoji}</Text>
            <View style={styles.moodBannerText}>
              <Text style={[styles.moodLabel, { color: colors.navy }]}>{mood.label}</Text>
              {flower && (
                <Text style={[styles.flowerName, { color: colors.navy + '90' }]}>{flower.emoji} {flower.name}</Text>
              )}
            </View>
            {entryType && (
              <View style={[styles.typePill, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
                <Text style={styles.typeEmoji}>{entryType.emoji}</Text>
                <Text style={[styles.typeLabel, { color: colors.navy }]}>{entryType.label}</Text>
              </View>
            )}
          </LinearGradient>
        )}

        <View style={styles.content}>
          {/* Meta row */}
          <View style={styles.metaRow}>
            <Text style={[styles.date, { color: colors.textMuted }]}>{format(entry.createdAt)}</Text>
            <View style={styles.metaPills}>
              {entry.weather && (
                <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={styles.pillEmoji}>{WEATHER_MAP[entry.weather] ?? ''}</Text>
                  <Text style={[styles.pillText, { color: colors.textMuted }]}>
                    {entry.weather.charAt(0).toUpperCase() + entry.weather.slice(1)}
                  </Text>
                </View>
              )}
              {energyInfo && (
                <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={styles.pillEmoji}>{energyInfo.emoji}</Text>
                  <Text style={[styles.pillText, { color: colors.textMuted }]}>{energyInfo.label}</Text>
                </View>
              )}
              {isFavorite && (
                <View style={[styles.pill, { backgroundColor: '#FFF3CD' }]}>
                  <Text style={styles.pillEmoji}>⭐</Text>
                  <Text style={[styles.pillText, { color: colors.navy }]}>Favorite</Text>
                </View>
              )}
            </View>
          </View>

          {/* Title */}
          {entry.title ? (
            <Text style={[styles.title, { color: colors.navy }]}>{entry.title}</Text>
          ) : null}

          {/* Body */}
          <Text style={[styles.body, { color: colors.text }]}>{entry.content}</Text>

          {/* Photos */}
          {entry.photos.length > 0 && (
            <View style={styles.photosGrid}>
              {entry.photos.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[
                    styles.photo,
                    entry.photos.length === 1
                      ? styles.photoFull
                      : entry.photos.length === 2
                        ? styles.photoHalf
                        : styles.photoThird,
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <View style={styles.tags}>
              {entry.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Garden footer */}
          {flower && (
            <View style={[styles.gardenFooter, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={styles.gardenEmoji}>{flower.emoji}</Text>
              <Text style={[styles.gardenText, { color: colors.textMuted }]}>
                This entry grew a <Text style={{ color: colors.navy, fontFamily: 'Nunito_700Bold' }}>{flower.name}</Text> in your Mood Garden
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, gap: 4,
  },
  navBtn: { padding: 6 },
  starBtnWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  starBtnLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  scroll: {},
  moodBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 18,
  },
  moodBannerEmoji: { fontSize: 36 },
  moodBannerText: { flex: 1, gap: 2 },
  moodLabel: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  flowerName: { fontSize: 13, fontFamily: 'Nunito_400Regular' },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  typeEmoji: { fontSize: 13 },
  typeLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  content: { paddingHorizontal: 24, paddingTop: 20, gap: 16 },
  metaRow: { gap: 8 },
  date: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillEmoji: { fontSize: 14 },
  pillText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', lineHeight: 32 },
  body: { fontSize: 16, fontFamily: 'Nunito_400Regular', lineHeight: 26 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { borderRadius: 14 },
  photoFull: { width: '100%', height: 260 },
  photoHalf: { width: '48%', height: 160 },
  photoThird: { width: '30%', height: 120 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  gardenFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, padding: 14, marginTop: 4,
  },
  gardenEmoji: { fontSize: 28 },
  gardenText: { flex: 1, fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  notFound: { fontSize: 16, fontFamily: 'Nunito_400Regular', marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  backBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold' },
});
