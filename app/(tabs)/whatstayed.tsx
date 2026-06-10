import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Modal, TextInput, KeyboardAvoidingView,
  Image, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import {
  loadStayed, saveStayed, todayStayedStr, formatMemoryDate,
  getMoodMeta, ALL_MOODS,
  type WhatStayedStore, type MemoryPhoto, type MoodTag,
} from '@/lib/whatStayedData';

const { width: SW } = Dimensions.get('window');
const GAP = 12;
const H_PAD = 16;
const CARD_W = (SW - H_PAD * 2 - GAP) / 2;
const CARD_IMG_H = CARD_W - 8;

const TILTS = ['-3.5deg', '2deg', '-1deg', '3deg', '0.5deg', '-2.5deg', '1.5deg', '-0.5deg'];

export default function WhatStayedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [store, setStore] = useState<WhatStayedStore | null>(null);
  const [captionModal, setCaptionModal] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [mood, setMood] = useState<MoodTag>('neutral');
  const [viewPhoto, setViewPhoto] = useState<MemoryPhoto | null>(null);

  const load = useCallback(async () => {
    const s = await loadStayed();
    setStore(s);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Allow Photos', 'Enable photo access to add memories.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingUri(result.assets[0].uri);
      setCaption('');
      setMood('neutral');
      setCaptionModal(true);
    }
  };

  const handleSave = async () => {
    if (!store || !pendingUri) return;
    const now = new Date();
    const photo: MemoryPhoto = {
      id: Date.now().toString(),
      photoUri: pendingUri,
      caption: caption.trim(),
      mood,
      date: todayStayedStr(),
      timestamp: now.toISOString(),
    };
    const updated: WhatStayedStore = { photos: [photo, ...store.photos] };
    await saveStayed(updated);
    setStore(updated);
    setCaptionModal(false);
    setPendingUri(null);
    setCaption('');
    setMood('neutral');
  };

  const handleDelete = (id: string) => {
    if (!store) return;
    Alert.alert('Remove photo', 'Remove this memory from What Stayed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated: WhatStayedStore = { photos: store.photos.filter(p => p.id !== id) };
          await saveStayed(updated);
          setStore(updated);
          setViewPhoto(null);
        },
      },
    ]);
  };

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: '#F7F3ED' }]}>
        <View style={[styles.loadingWrap, { paddingTop: topPad + 60 }]}>
          <Text style={styles.loadingEmoji}>📷</Text>
          <Text style={styles.loadingText}>Opening the album…</Text>
        </View>
      </View>
    );
  }

  const renderPolaroid = ({ item, index }: { item: MemoryPhoto; index: number }) => {
    const tilt = TILTS[index % TILTS.length];
    const moodMeta = getMoodMeta(item.mood);
    return (
      <TouchableOpacity
        onPress={() => setViewPhoto(item)}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.9}
        style={[styles.polaroidOuter, { transform: [{ rotate: tilt }] }]}
      >
        <View style={styles.polaroid}>
          <Image
            source={{ uri: item.photoUri }}
            style={styles.polaroidImage}
            resizeMode="cover"
          />
          <View style={styles.polaroidBottom}>
            {item.caption.length > 0 && (
              <Text style={styles.polaroidCaption} numberOfLines={2}>{item.caption}</Text>
            )}
            <View style={styles.polaroidMeta}>
              <Text style={styles.polaroidMood}>{moodMeta.emoji}</Text>
              <Text style={styles.polaroidDate}>{formatMemoryDate(item.date)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F7F3ED' }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#EDE5D8', '#F7F3ED']}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>What Stayed 📷</Text>
          <Text style={styles.headerSub}>
            {store.photos.length > 0
              ? `${store.photos.length} ${store.photos.length === 1 ? 'memory' : 'memories'} preserved`
              : 'Your private photo album'}
          </Text>
        </View>
        <TouchableOpacity onPress={handlePickPhoto} style={styles.headerAddBtn}>
          <Ionicons name="add" size={26} color="#8B7A60" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Empty state ── */}
      {store.photos.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyPolaroidStack}>
            <View style={[styles.emptyPolaroidBg, { transform: [{ rotate: '-4deg' }], top: 8, left: 8 }]} />
            <View style={[styles.emptyPolaroidBg, { transform: [{ rotate: '3deg' }], top: 4, left: 4 }]} />
            <View style={styles.emptyPolaroidFront}>
              <View style={styles.emptyPolaroidImg}>
                <Text style={{ fontSize: 32 }}>📷</Text>
              </View>
              <Text style={styles.emptyPolaroidLabel}>your first memory</Text>
            </View>
          </View>
          <Text style={styles.emptyTitle}>The album is empty</Text>
          <Text style={styles.emptyText}>
            {"Some moments stay. Most fade.\nThis is where the ones that stayed live."}
          </Text>
          <TouchableOpacity onPress={handlePickPhoto} style={styles.emptyBtn}>
            <Ionicons name="camera-outline" size={18} color="#8B7A60" />
            <Text style={styles.emptyBtnText}>Add first photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={store.photos}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
          ]}
          columnWrapperStyle={styles.gridRow}
          renderItem={renderPolaroid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Caption modal (after picking photo) ── */}
      <Modal
        visible={captionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCaptionModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Photo preview */}
              {pendingUri && (
                <View style={styles.previewPolaroid}>
                  <Image source={{ uri: pendingUri }} style={styles.previewImage} resizeMode="cover" />
                  <View style={styles.previewBottom} />
                </View>
              )}

              <Text style={styles.modalTitle}>Add a caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="What do you want to remember about this?"
                placeholderTextColor="#C4B8A8"
                value={caption}
                onChangeText={setCaption}
                maxLength={120}
                multiline
              />

              <Text style={styles.moodLabel}>How does it feel?</Text>
              <View style={styles.moodRow}>
                {ALL_MOODS.map(m => {
                  const meta = getMoodMeta(m);
                  const active = mood === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setMood(m)}
                      style={[
                        styles.moodChip,
                        active && { backgroundColor: meta.color + '30', borderColor: meta.color },
                        !active && { borderColor: '#E0D8CC' },
                      ]}
                    >
                      <Text style={styles.moodEmoji}>{meta.emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  onPress={() => { setCaptionModal(false); setPendingUri(null); }}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Keep it 📷</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Full-screen viewer ── */}
      <Modal
        visible={!!viewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewPhoto(null)}
      >
        {viewPhoto && (
          <View style={styles.viewerOverlay}>
            <TouchableOpacity
              style={styles.viewerClose}
              onPress={() => setViewPhoto(null)}
            >
              <Ionicons name="close" size={26} color="#FAF8F3" />
            </TouchableOpacity>

            <View style={styles.viewerPolaroid}>
              <Image
                source={{ uri: viewPhoto.photoUri }}
                style={styles.viewerImage}
                resizeMode="cover"
              />
              <View style={styles.viewerBottom}>
                {viewPhoto.caption.length > 0 && (
                  <Text style={styles.viewerCaption}>{viewPhoto.caption}</Text>
                )}
                <View style={styles.viewerMeta}>
                  <Text style={styles.viewerMoodEmoji}>{getMoodMeta(viewPhoto.mood).emoji}</Text>
                  <Text style={styles.viewerMoodLabel}>{getMoodMeta(viewPhoto.mood).label}</Text>
                  <Text style={styles.viewerDate}>{formatMemoryDate(viewPhoto.date)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleDelete(viewPhoto.id)}
              style={styles.viewerDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#FAF8F380" />
              <Text style={styles.viewerDeleteText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', gap: 12 },
  loadingEmoji: { fontSize: 40 },
  loadingText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#8B7A60', fontStyle: 'italic' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E0D8CC',
  },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', color: '#3D2E1E' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: '#8B7A60', fontStyle: 'italic', marginTop: 2 },
  headerAddBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#EDE5D8', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D4C8B8',
  },

  /* Empty state */
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 16,
  },
  emptyPolaroidStack: { width: 140, height: 160, marginBottom: 8 },
  emptyPolaroidBg: {
    position: 'absolute', width: 120, height: 150,
    backgroundColor: '#FFF9F0', borderWidth: 1, borderColor: '#E0D8CC',
    shadowColor: '#8B7A60', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  emptyPolaroidFront: {
    position: 'absolute', width: 120, height: 150,
    backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E0D8CC',
    padding: 8, paddingBottom: 24, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8B7A60', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  emptyPolaroidImg: {
    flex: 1, width: '100%', backgroundColor: '#EDE5D8',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyPolaroidLabel: {
    fontSize: 9, fontFamily: 'Nunito_600SemiBold', color: '#C4B8A8',
    textAlign: 'center', marginTop: 6,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', color: '#3D2E1E' },
  emptyText: {
    fontSize: 13, fontFamily: 'Nunito_400Regular', color: '#8B7A60',
    textAlign: 'center', lineHeight: 20, fontStyle: 'italic',
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EDE5D8', borderRadius: 16, borderWidth: 1,
    borderColor: '#D4C8B8', paddingHorizontal: 22, paddingVertical: 12,
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#6B5030' },

  /* Grid */
  grid: { paddingHorizontal: H_PAD, paddingTop: 20 },
  gridRow: { gap: GAP, marginBottom: 20, alignItems: 'flex-start' },

  polaroidOuter: {
    shadowColor: '#8B7A60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  polaroid: {
    width: CARD_W,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#EDE8E0',
    padding: 7,
    paddingBottom: 0,
  },
  polaroidImage: {
    width: CARD_W - 14,
    height: CARD_IMG_H,
    backgroundColor: '#EDE5D8',
  },
  polaroidBottom: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    minHeight: 52,
    gap: 4,
  },
  polaroidCaption: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
    color: '#3D2E1E',
    lineHeight: 15,
  },
  polaroidMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  polaroidMood: { fontSize: 11 },
  polaroidDate: { fontSize: 9, fontFamily: 'Nunito_400Regular', color: '#B4A898', flex: 1 },

  /* Caption modal */
  modalOverlay: {
    flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 14,
    borderWidth: 1, borderColor: '#E0D8CC',
  },
  previewPolaroid: {
    alignSelf: 'center',
    backgroundColor: '#FFFDF8',
    padding: 7, paddingBottom: 0,
    borderWidth: 1, borderColor: '#EDE8E0',
    shadowColor: '#8B7A60', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8,
    transform: [{ rotate: '-1.5deg' }],
    marginBottom: 4,
  },
  previewImage: { width: 160, height: 130, backgroundColor: '#EDE5D8' },
  previewBottom: { height: 24 },

  modalTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#3D2E1E' },
  captionInput: {
    borderWidth: 1.5, borderColor: '#E0D8CC', borderRadius: 14,
    padding: 12, fontSize: 13, fontFamily: 'Nunito_400Regular',
    color: '#3D2E1E', minHeight: 72, textAlignVertical: 'top',
    backgroundColor: '#FAF8F3',
  },
  moodLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#3D2E1E' },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  moodEmoji: { fontSize: 18 },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0D8CC',
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#8B7A60' },
  saveBtn: {
    flex: 2, borderRadius: 14, backgroundColor: '#C9A87C',
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#fff' },

  /* Full viewer */
  viewerOverlay: {
    flex: 1, backgroundColor: '#1A140E',
    alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  viewerClose: {
    position: 'absolute', top: 54, right: 24, padding: 8,
  },
  viewerPolaroid: {
    backgroundColor: '#FFFDF8',
    padding: 10, paddingBottom: 0,
    borderWidth: 1, borderColor: '#EDE8E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20,
  },
  viewerImage: {
    width: SW - 60,
    height: (SW - 60) * 0.82,
    backgroundColor: '#EDE5D8',
  },
  viewerBottom: {
    paddingVertical: 14, paddingHorizontal: 4, gap: 8,
  },
  viewerCaption: {
    fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: '#3D2E1E',
    textAlign: 'center', lineHeight: 22,
  },
  viewerMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  viewerMoodEmoji: { fontSize: 16 },
  viewerMoodLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: '#8B7A60' },
  viewerDate: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: '#B4A898' },

  viewerDelete: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  viewerDeleteText: {
    fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#FAF8F380',
  },
});
