import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import { loadForkcast, saveForkcast, todayStr, type MealType, type MealEntry } from '@/lib/forkcastData';

const MEAL_TYPES: { type: MealType; label: string; emoji: string; color: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🌅', color: '#FFCA6B' },
  { type: 'lunch',     label: 'Lunch',     emoji: '🥗', color: '#5DB87A' },
  { type: 'dinner',    label: 'Dinner',    emoji: '🍛', color: '#F4A261' },
  { type: 'snack',     label: 'Snack',     emoji: '🍎', color: '#EF6C6C' },
  { type: 'drink',     label: 'Drink',     emoji: '☕', color: '#7EC8E3' },
];

const MOODS = [
  { key: 'energized',   emoji: '😊', label: 'Energized' },
  { key: 'satisfied',   emoji: '😌', label: 'Satisfied' },
  { key: 'sleepy',      emoji: '😴', label: 'Sleepy' },
  { key: 'hungry',      emoji: '😕', label: 'Still Hungry' },
  { key: 'uncomfortable', emoji: '🤢', label: 'Uncomfortable' },
];

const WORTH_IT = [
  { key: 'absolutely',  emoji: '❤️', label: 'Absolutely' },
  { key: 'pretty',      emoji: '😊', label: 'Pretty Worth It' },
  { key: 'not_really',  emoji: '😐', label: 'Not Really' },
];

export default function LogMealScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; prefillJson?: string }>();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [mealType, setMealType] = useState<MealType>(
    (params.type as MealType) ?? 'breakfast'
  );
  const [name, setName]         = useState('');
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG]     = useState('');
  const [fatG, setFatG]         = useState('');
  const [notes, setNotes]       = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [mood, setMood]         = useState('');
  const [worthIt, setWorthIt]   = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (params.prefillJson) {
      try {
        const p = JSON.parse(params.prefillJson as string);
        if (p.name)     setName(p.name);
        if (p.calories) setCalories(String(p.calories));
        if (p.proteinG) setProteinG(String(p.proteinG));
        if (p.carbsG)   setCarbsG(String(p.carbsG));
        if (p.fatG)     setFatG(String(p.fatG));
        if (p.photoUri) setPhotoUri(p.photoUri);
      } catch {}
    }
  }, []);

  const handleVision = async (source: 'camera' | 'gallery') => {
    let result;
    if (source === 'camera') {
      result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: false });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: false, mediaTypes: ['images'] });
    }
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setPhotoUri(uri);
    setAnalyzing(true);

    try {
      let b64 = '';
      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      }

      const resp = await fetch('/api/food-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, mimeType: 'image/jpeg' }),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Vision failed');

      router.push({
        pathname: '/forkcast/meal-vision',
        params: {
          visionJson: JSON.stringify(json),
          photoUri: uri,
          mealType,
        },
      } as any);
    } catch (err: any) {
      Alert.alert('Nimbus Vision', err?.message ?? 'Could not analyze the photo. You can log it manually!');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !calories) return Alert.alert('', 'Please add a food name and calories.');
    setSaving(true);
    try {
      const store = await loadForkcast();
      const entry: MealEntry = {
        id: Date.now().toString(),
        date: todayStr(),
        type: mealType,
        name: name.trim(),
        calories: parseFloat(calories) || 0,
        proteinG: parseFloat(proteinG) || 0,
        carbsG:   parseFloat(carbsG)   || 0,
        fatG:     parseFloat(fatG)     || 0,
        photoUri: photoUri || undefined,
        notes:    notes.trim() || undefined,
        mood:     mood || undefined,
        worthIt:  worthIt || undefined,
        timestamp: new Date().toISOString(),
      };
      await saveForkcast({ ...store, meals: [...store.meals, entry] });
      router.canGoBack() ? router.back() : router.replace('/(tabs)/forkcast' as any);
    } catch {
      Alert.alert('Error', 'Could not save meal.');
    } finally {
      setSaving(false);
    }
  };

  const isTreat = parseFloat(calories) > 500;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/forkcast' as any)} style={styles.navBtn}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Log a Meal</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        >
          <Text style={styles.saveTxt}>{saving ? '...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 60 : insets.bottom + 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Meal type selector */}
        <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8, marginTop: 16 }]}>MEAL TYPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MEAL_TYPES.map(mt => (
              <TouchableOpacity
                key={mt.type}
                onPress={() => setMealType(mt.type)}
                style={[
                  styles.mealTypeChip,
                  { borderColor: mealType === mt.type ? mt.color : colors.borderLight, backgroundColor: mealType === mt.type ? mt.color + '20' : colors.surface },
                ]}
              >
                <Text style={styles.mealTypeEmoji}>{mt.emoji}</Text>
                <Text style={[styles.mealTypeLabel, { color: mealType === mt.type ? mt.color : colors.textMuted }]}>{mt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Nimbus Vision */}
        <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>✨ NIMBUS VISION</Text>
        <View style={[styles.visionCard, { backgroundColor: colors.lavender + '30', borderColor: colors.lavenderDeep + '30' }]}>
          <NimbusBird size={36} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.visionTitle, { color: colors.navy }]}>
              {analyzing ? 'Analyzing your meal...' : 'Let Nimbus identify your food!'}
            </Text>
            <Text style={[styles.visionSub, { color: colors.textMuted }]}>Take a photo and I'll estimate the nutrition.</Text>
          </View>
          {!analyzing && (
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => handleVision('camera')} style={[styles.visionBtn, { backgroundColor: colors.lavenderDeep }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleVision('gallery')} style={[styles.visionBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="images" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {analyzing && (
            <View style={[styles.visionBtn, { backgroundColor: colors.lavenderDeep + '40' }]}>
              <Ionicons name="sparkles" size={16} color={colors.lavenderDeep} />
            </View>
          )}
        </View>

        {/* Manual entry */}
        <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8, marginTop: 4 }]}>MANUAL ENTRY</Text>
        <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <TextInput
            style={[styles.foodNameInput, { color: colors.navy, borderBottomColor: colors.borderLight }]}
            placeholder="Food or meal name..."
            placeholderTextColor={colors.textLight}
            value={name}
            onChangeText={setName}
          />
          <View style={styles.macrosRow}>
            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Calories</Text>
              <TextInput
                style={[styles.macroInput, { color: colors.navy, borderColor: colors.borderLight }]}
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Protein (g)</Text>
              <TextInput
                style={[styles.macroInput, { color: colors.navy, borderColor: colors.borderLight }]}
                value={proteinG}
                onChangeText={setProteinG}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Carbs (g)</Text>
              <TextInput
                style={[styles.macroInput, { color: colors.navy, borderColor: colors.borderLight }]}
                value={carbsG}
                onChangeText={setCarbsG}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Fat (g)</Text>
              <TextInput
                style={[styles.macroInput, { color: colors.navy, borderColor: colors.borderLight }]}
                value={fatG}
                onChangeText={setFatG}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <TextInput
            style={[styles.notesInput, { color: colors.navy, borderColor: colors.borderLight }]}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Mood check-in */}
        <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8, marginTop: 4 }]}>HOW DID THIS MEAL MAKE YOU FEEL?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMood(mood === m.key ? '' : m.key)}
                style={[styles.moodChip, {
                  borderColor: mood === m.key ? colors.primary : colors.borderLight,
                  backgroundColor: mood === m.key ? colors.primary + '18' : colors.surface,
                }]}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, { color: mood === m.key ? colors.primary : colors.textMuted }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Worth It */}
        {isTreat && (
          <View>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>WAS IT WORTH IT? ✨</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {WORTH_IT.map(w => (
                <TouchableOpacity
                  key={w.key}
                  onPress={() => setWorthIt(worthIt === w.key ? '' : w.key)}
                  style={[styles.worthChip, {
                    flex: 1,
                    borderColor: worthIt === w.key ? colors.lavenderDeep : colors.borderLight,
                    backgroundColor: worthIt === w.key ? colors.lavender + '40' : colors.surface,
                  }]}
                >
                  <Text style={{ fontSize: 18 }}>{w.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: worthIt === w.key ? colors.lavenderDeep : colors.textMuted, textAlign: 'center' }]}>
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  navBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveTxt: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  scroll: { paddingHorizontal: 18 },
  label: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1.5, textTransform: 'uppercase' },
  mealTypeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
  },
  mealTypeEmoji: { fontSize: 16 },
  mealTypeLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  visionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 20,
  },
  visionTitle: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  visionSub: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 2 },
  visionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  inputCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  foodNameInput: {
    fontSize: 16, fontFamily: 'Nunito_600SemiBold', padding: 14,
    borderBottomWidth: 1,
  },
  macrosRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  macroField: { flex: 1, alignItems: 'center', gap: 4 },
  macroLabel: { fontSize: 10, fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  macroInput: {
    width: '100%', textAlign: 'center', borderWidth: 1, borderRadius: 10, padding: 8,
    fontSize: 14, fontFamily: 'Nunito_700Bold',
  },
  notesInput: {
    borderTopWidth: 1, padding: 12, fontSize: 13, fontFamily: 'Nunito_400Regular', minHeight: 60,
  },
  moodChip: { alignItems: 'center', gap: 4, padding: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5 },
  moodEmoji: { fontSize: 20 },
  moodLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  worthChip: { alignItems: 'center', gap: 6, padding: 12, borderRadius: 14, borderWidth: 1.5 },
});
