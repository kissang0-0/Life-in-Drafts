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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { addUnsentMessage } from '@/lib/firestore';
import { MoodPicker } from '@/components/MoodPicker';

export default function NewUnsentMessage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [to, setTo] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleSave = async () => {
    if (!content.trim() || !user) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await addUnsentMessage(user.uid, {
        to: to.trim() || 'you',
        content: content.trim(),
        mood,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save your letter.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Unsent Letter</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !content.trim()}
          style={[styles.saveBtn, { backgroundColor: colors.accentDeep, opacity: !content.trim() ? 0.5 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Seal</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Notice */}
        <View style={[styles.notice, { backgroundColor: colors.accent + '50', borderColor: colors.accentDeep + '40' }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.accentDeep} />
          <Text style={[styles.noticeText, { color: colors.accentDeep }]}>
            This letter will never be sent. It belongs only to you.
          </Text>
        </View>

        {/* To field */}
        <View style={[styles.toField, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.toLabel, { color: colors.textMuted }]}>Dear</Text>
          <TextInput
            style={[styles.toInput, { color: colors.navy, fontFamily: 'Nunito_600SemiBold' }]}
            placeholder="who is this for?"
            placeholderTextColor={colors.textLight}
            value={to}
            onChangeText={setTo}
          />
        </View>

        {/* Mood */}
        <View style={styles.moodSection}>
          <Text style={[styles.label, { color: colors.text }]}>The feeling behind these words</Text>
          <MoodPicker selected={mood} onSelect={setMood} />
        </View>

        {/* Content */}
        <TextInput
          style={[
            styles.contentInput,
            { color: colors.text, fontFamily: 'Nunito_400Regular', borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          placeholder={`Everything you wanted to say but couldn't...`}
          placeholderTextColor={colors.textLight}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />

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
  navBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: 'Nunito_600SemiBold', lineHeight: 18 },
  toField: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  toLabel: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  toInput: { flex: 1, fontSize: 15 },
  moodSection: { gap: 8, marginHorizontal: -20 },
  label: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', paddingHorizontal: 20 },
  contentInput: {
    fontSize: 16, lineHeight: 26, minHeight: 220,
    borderWidth: 1.5, borderRadius: 16, padding: 16, textAlignVertical: 'top',
  },
});
