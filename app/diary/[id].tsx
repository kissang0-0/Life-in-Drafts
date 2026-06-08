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
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { deleteDiaryEntry } from '@/lib/firestore';
import { MOOD_OPTIONS } from '@/constants/nimbus';
import { format } from '@/lib/dateUtils';

export default function DiaryEntryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const diary = useAppStore((s) => s.diary);

  const entry = diary.find((e) => e.id === id);
  const mood = entry ? MOOD_OPTIONS.find((m) => m.key === entry.mood) : null;
  const moodColor = entry?.mood ? colors.moodColors[entry.mood] ?? colors.surfaceAlt : colors.surfaceAlt;

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
            router.back();
          }
        },
      },
    ]);
  };

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.notFound, { color: colors.textMuted }]}>Entry not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
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
          <View style={[styles.moodBanner, { backgroundColor: moodColor }]}>
            <Ionicons name={mood.icon} size={24} color={colors.navy} />
            <Text style={[styles.moodText, { color: colors.navy }]}>{mood.label}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Date */}
          <Text style={[styles.date, { color: colors.textMuted }]}>{format(entry.createdAt)}</Text>

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
                    entry.photos.length === 1 ? styles.photoFull : styles.photoHalf,
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navBtn: { padding: 6 },
  scroll: {},
  moodBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  moodText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  content: { paddingHorizontal: 24, paddingTop: 20, gap: 16 },
  date: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', lineHeight: 32 },
  body: { fontSize: 16, fontFamily: 'Nunito_400Regular', lineHeight: 26 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { borderRadius: 12 },
  photoFull: { width: '100%', height: 240 },
  photoHalf: { width: '48%', height: 160 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  notFound: { fontSize: 16, fontFamily: 'Nunito_400Regular', marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  backBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold' },
});
