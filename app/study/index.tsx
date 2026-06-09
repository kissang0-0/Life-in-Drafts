import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/EmptyState';
import { FloatingButton } from '@/components/FloatingButton';
import { addStudyNote, deleteStudyNote, StudyNote } from '@/lib/firestore';

const FOCUS_DURATIONS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
];

export default function StudyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const notes = useAppStore((s) => s.studyNotes);
  const user = useAuthStore((s) => s.user);

  const [showModal, setShowModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Focus timer
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s <= 1) {
            setTimerActive(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return selectedDuration;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerActive]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !user) return;
    setSaving(true);
    try {
      await addStudyNote(user.uid, { title: noteTitle.trim(), content: noteContent.trim(), tags: [] });
      setNoteTitle('');
      setNoteContent('');
      setShowModal(false);
    } catch {
      Alert.alert('Error', 'Could not save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (note: StudyNote) => {
    Alert.alert('Delete Note', `Remove "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => user && deleteStudyNote(user.uid, note.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.navy} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.navy }]}>Study Space</Text>
        </View>

        {/* Focus Timer */}
        <View style={[styles.timerCard, { backgroundColor: colors.success, shadowColor: colors.success }]}>
          <Text style={styles.timerLabel}>Focus Timer</Text>
          <Text style={styles.timerDisplay}>{formatTime(timerSeconds)}</Text>

          <View style={styles.durationRow}>
            {FOCUS_DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.seconds}
                onPress={() => { setSelectedDuration(d.seconds); setTimerSeconds(d.seconds); setTimerActive(false); }}
                style={[
                  styles.durationBtn,
                  { backgroundColor: selectedDuration === d.seconds ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)' },
                ]}
              >
                <Text style={styles.durationText}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setTimerActive(!timerActive)}
            style={[styles.timerBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
          >
            <Ionicons name={timerActive ? 'pause' : 'play'} size={22} color="#fff" />
            <Text style={styles.timerBtnText}>{timerActive ? 'Pause' : 'Start Focus'}</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>My Notes</Text>
        {notes.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No notes yet"
            subtitle="Write your first study note"
          />
        ) : (
          notes.map((note) => (
            <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.surface, shadowColor: colors.shadowDeep }]}>
              <View style={styles.noteContent}>
                <Text style={[styles.noteTitle, { color: colors.navy }]} numberOfLines={1}>{note.title}</Text>
                {note.content ? (
                  <Text style={[styles.notePreview, { color: colors.textMuted }]} numberOfLines={2}>{note.content}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(note)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <FloatingButton onPress={() => setShowModal(true)} icon="add" />

      {/* Add Note Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.navy }]}>New Note</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: 'Nunito_700Bold' }]}
              placeholder="Title..."
              placeholderTextColor={colors.textLight}
              value={noteTitle}
              onChangeText={setNoteTitle}
              autoFocus
            />
            <TextInput
              style={[styles.modalTextarea, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: 'Nunito_400Regular' }]}
              placeholder="Write your notes..."
              placeholderTextColor={colors.textLight}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={handleAddNote}
              disabled={!noteTitle.trim() || saving}
              style={[styles.modalBtn, { backgroundColor: colors.success, opacity: !noteTitle.trim() ? 0.5 : 1 }]}
            >
              <Text style={styles.modalBtnText}>{saving ? 'Saving...' : 'Save Note'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold' },
  timerCard: {
    borderRadius: 24, padding: 24, alignItems: 'center', gap: 16, marginBottom: 24,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  timerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Nunito_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  timerDisplay: { color: '#fff', fontSize: 56, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 2 },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  durationText: { color: '#fff', fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  timerBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', marginBottom: 12 },
  noteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  noteContent: { flex: 1, gap: 4 },
  noteTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  notePreview: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  modalInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalTextarea: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  modalBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
});
