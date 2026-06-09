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
import { addUnsentConversation, RELATIONSHIP_OPTIONS, RelationshipType } from '@/lib/firestore';

const THEME_OPTIONS = [
  { key: 'blue',     color: '#5BB8D4', label: 'Sky' },
  { key: 'purple',   color: '#B48DE8', label: 'Lavender' },
  { key: 'pink',     color: '#F5A0B5', label: 'Rose' },
  { key: 'green',    color: '#5DB87A', label: 'Sage' },
  { key: 'orange',   color: '#F5A555', label: 'Amber' },
  { key: 'midnight', color: '#3A4A6B', label: 'Midnight' },
  { key: 'teal',     color: '#3DBFB8', label: 'Teal' },
];

export default function NewConversation() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('friend');
  const [theme, setTheme] = useState('blue');
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const ref = await addUnsentConversation(user.uid, {
        recipientName: name.trim(),
        relationshipType: relationship,
        theme,
      });
      router.replace(`/unsent/${ref.id}`);
    } catch {
      Alert.alert('Error', 'Could not start this conversation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>New Conversation</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !name.trim() ? 0.4 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Start</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.notice, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
          <Ionicons name="lock-closed-outline" size={15} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.primaryDark ?? colors.primary }]}>
            No messages will ever be sent. This is yours alone.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>WHO IS THIS TO?</Text>
          <View style={[styles.nameField, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="person-outline" size={18} color={colors.textLight} />
            <TextInput
              style={[styles.nameInput, { color: colors.navy }]}
              placeholder="Name or nickname"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>RELATIONSHIP</Text>
          <View style={styles.relGrid}>
            {RELATIONSHIP_OPTIONS.map((opt) => {
              const selected = relationship === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.relChip,
                    {
                      backgroundColor: selected ? colors.navy : colors.surface,
                      borderColor: selected ? colors.navy : colors.border,
                    },
                  ]}
                  onPress={() => setRelationship(opt.key)}
                >
                  <Text style={styles.relEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.relLabel, { color: selected ? '#fff' : colors.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>CHAT THEME</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.themeCircle,
                  { backgroundColor: t.color },
                  theme === t.key && styles.themeCircleSelected,
                ]}
                onPress={() => setTheme(t.key)}
              >
                {theme === t.key && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
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
  navBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 24 },

  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: 'Nunito_600SemiBold', lineHeight: 18 },

  section: { gap: 10 },
  label: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 1 },

  nameField: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
  },
  nameInput: { flex: 1, fontSize: 16, fontFamily: 'Nunito_600SemiBold' },

  relGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
  },
  relEmoji: { fontSize: 16 },
  relLabel: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  themeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  themeCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  themeCircleSelected: {
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
});
