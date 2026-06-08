import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { addVaultEntry } from '@/lib/firestore';

const TYPES = [
  { value: 'diary', label: 'Journal', icon: 'book-outline' },
  { value: 'unsent', label: 'Unsent', icon: 'mail-outline' },
  { value: 'note', label: 'Note', icon: 'document-text-outline' },
] as const;

type EntryType = 'diary' | 'unsent' | 'note';

export default function NewVaultEntry() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [type, setType] = useState<EntryType>('diary');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === 'web' ? 40 : insets.top;

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !user?.uid) return;
    setSaving(true);
    await addVaultEntry(user.uid, { type, title: title.trim(), content: content.trim() });
    router.back();
  };

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Vault Entry</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!title.trim() || !content.trim() || saving}
              style={[styles.saveBtn, { opacity: (!title.trim() || !content.trim()) ? 0.4 : 1 }]}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                onPress={() => setType(t.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon as any}
                  size={16}
                  color={type === t.value ? '#7EC8E3' : 'rgba(255,255,255,0.4)'}
                />
                <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Title…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
          />

          <TextInput
            style={styles.contentInput}
            placeholder="Write here. This is your private vault."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={content}
            onChangeText={setContent}
            multiline
            autoCapitalize="sentences"
            textAlignVertical="top"
          />

          <View style={styles.note}>
            <Ionicons name="lock-closed" size={13} color="rgba(126,200,227,0.5)" />
            <Text style={styles.noteText}>Hidden from search, memories & dashboards</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', color: '#fff' },
  saveBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(126,200,227,0.2)',
    borderRadius: 12,
  },
  saveBtnText: { color: '#7EC8E3', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeBtnActive: {
    borderColor: 'rgba(126,200,227,0.4)',
    backgroundColor: 'rgba(126,200,227,0.08)',
  },
  typeBtnText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: 'rgba(255,255,255,0.4)' },
  typeBtnTextActive: { color: '#7EC8E3' },
  titleInput: {
    fontSize: 22, fontFamily: 'Nunito_700Bold', color: '#fff',
    paddingVertical: 8, marginBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  contentInput: {
    fontSize: 16, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.8)',
    lineHeight: 26, minHeight: 220,
  },
  note: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 32, opacity: 0.7,
  },
  noteText: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: 'rgba(126,200,227,0.5)' },
});
