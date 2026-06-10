import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { addMemory } from '@/lib/firestore';
import { uploadPhoto } from '@/lib/storage';

const FRAME_COLORS = ['#FFFFFF', '#FFF8E1', '#E8F5E9', '#E3F2FD', '#F3E5F5', '#FCE4EC', '#E0F7FA'];

export default function NewMemory() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [photoUri, setPhotoUri] = useState('');
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }));
  const [frameColor, setFrameColor] = useState(FRAME_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!photoUri || !user) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const url = await uploadPhoto(user.uid, photoUri);
      await addMemory(user.uid, {
        photo: url,
        caption: caption.trim(),
        date,
        frameColor,
      });
      router.canGoBack() ? router.back() : router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Error', 'Could not save your memory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home' as any)} style={styles.navBtn}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>New Memory</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !photoUri}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !photoUri ? 0.5 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === 'web' ? 34 + 40 : insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Polaroid preview */}
        <View style={[styles.polaroidPreview, { backgroundColor: frameColor, marginBottom: 16 }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.photoActions}>
                <TouchableOpacity onPress={handlePickPhoto} style={[styles.photoActionBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="images-outline" size={24} color="#fff" />
                  <Text style={styles.photoActionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCamera} style={[styles.photoActionBtn, { backgroundColor: colors.lavenderDeep }]}>
                  <Ionicons name="camera-outline" size={24} color="#fff" />
                  <Text style={styles.photoActionText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={styles.captionArea}>
            <TextInput
              style={[styles.captionInput, { color: colors.text, fontFamily: 'Nunito_600SemiBold' }]}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textLight}
              value={caption}
              onChangeText={setCaption}
              multiline
              textAlign="center"
            />
          </View>
        </View>

        {!!photoUri && (
          <TouchableOpacity
            onPress={handlePickPhoto}
            style={[styles.changePhotoBtn, { borderColor: colors.border, marginBottom: 16 }]}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.changePhotoText, { color: colors.textMuted }]}>Change photo</Text>
          </TouchableOpacity>
        )}

        {/* Date */}
        <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.fieldInput, { color: colors.text, fontFamily: 'Nunito_400Regular' }]}
            value={date}
            onChangeText={setDate}
            placeholder="Date"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Frame color */}
        <View style={{ marginBottom: 8 }}>
          <Text style={[styles.frameLabel, { color: colors.text, marginBottom: 10 }]}>Frame color</Text>
          <View style={styles.colorRow}>
            {FRAME_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setFrameColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderColor: colors.border, borderWidth: 1 },
                  frameColor === c && { borderWidth: 2.5, borderColor: colors.navy },
                ]}
              />
            ))}
          </View>
        </View>
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
  scroll: { paddingHorizontal: 24, paddingTop: 24 },
  polaroidPreview: {
    borderRadius: 4, padding: 10, paddingBottom: 16, alignSelf: 'center', width: '85%',
    shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  previewPhoto: { width: '100%', aspectRatio: 1, borderRadius: 2 },
  photoPlaceholder: {
    width: '100%', aspectRatio: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center',
  },
  photoActions: { flexDirection: 'row', gap: 16 },
  photoActionBtn: {
    alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14,
  },
  photoActionText: { color: '#fff', fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  captionArea: { paddingTop: 10 },
  captionInput: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  changePhotoText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  fieldInput: { flex: 1, fontSize: 15 },
  frameLabel: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
});
