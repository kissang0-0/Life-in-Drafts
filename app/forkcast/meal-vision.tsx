import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import { loadForkcast, saveForkcast, todayStr, type MealType, type MealEntry } from '@/lib/forkcastData';

type VisionItem = {
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: 'high' | 'medium' | 'low';
};

type VisionResult = {
  items: VisionItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  mealName: string;
  nimbusNote: string;
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: '#5DB87A', medium: '#FFCA6B', low: '#EF6C6C',
};

export default function MealVisionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ visionJson?: string; photoUri?: string; mealType?: string }>();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const raw = params.visionJson ? (() => { try { return JSON.parse(params.visionJson as string) as VisionResult; } catch { return null; } })() : null;
  const photoUri = params.photoUri as string ?? '';
  const mealType = (params.mealType as MealType) ?? 'lunch';

  const [items, setItems] = useState<VisionItem[]>(raw?.items ?? []);
  const [mealName, setMealName] = useState(raw?.mealName ?? 'Meal');
  const [saving, setSaving] = useState(false);

  const updateItem = (i: number, patch: Partial<VisionItem>) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const totals = items.reduce((acc, it) => ({
    calories: acc.calories + (it.calories || 0),
    proteinG: acc.proteinG + (it.proteinG || 0),
    carbsG:   acc.carbsG   + (it.carbsG   || 0),
    fatG:     acc.fatG     + (it.fatG     || 0),
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });

  const handleSave = async () => {
    setSaving(true);
    try {
      const store = await loadForkcast();
      const entry: MealEntry = {
        id: Date.now().toString(),
        date: todayStr(),
        type: mealType,
        name: mealName,
        calories: totals.calories,
        proteinG: totals.proteinG,
        carbsG:   totals.carbsG,
        fatG:     totals.fatG,
        photoUri: photoUri || undefined,
        timestamp: new Date().toISOString(),
      };
      await saveForkcast({ ...store, meals: [...store.meals, entry] });
      router.replace('/(tabs)/forkcast' as any);
    } catch {
      Alert.alert('Error', 'Could not save meal.');
    } finally {
      setSaving(false);
    }
  };

  if (!raw) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
        <Text style={[styles.emptyTxt, { color: colors.navy }]}>Could not load vision results.</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Nimbus Vision</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
          <Text style={styles.saveTxt}>{saving ? '...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 60 : insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo + Nimbus note */}
        <View style={[styles.visionHero, { backgroundColor: colors.lavender + '30', borderColor: colors.lavenderDeep + '30' }]}>
          {!!photoUri && (
            <Image source={{ uri: photoUri }} style={styles.heroPhoto} resizeMode="cover" />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <NimbusBird size={36} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nimbusLabel, { color: colors.lavenderDeep }]}>NIMBUS SAYS</Text>
              <Text style={[styles.nimbusNote, { color: colors.navy }]}>{raw.nimbusNote}</Text>
            </View>
          </View>
        </View>

        {/* Meal name */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MEAL NAME</Text>
        <TextInput
          style={[styles.mealNameInput, { color: colors.navy, backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          value={mealName}
          onChangeText={setMealName}
          placeholder="Meal name..."
          placeholderTextColor={colors.textLight}
        />

        {/* Detected items */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DETECTED FOODS</Text>
        {items.map((item, i) => (
          <View key={i} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.itemHeader}>
              <View style={[styles.confidenceDot, { backgroundColor: CONFIDENCE_COLOR[item.confidence] }]} />
              <TextInput
                style={[styles.itemName, { color: colors.navy }]}
                value={item.name}
                onChangeText={v => updateItem(i, { name: v })}
              />
              <TouchableOpacity onPress={() => removeItem(i)}>
                <Ionicons name="close-circle" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.itemPortion, { color: colors.textMuted }]}>{item.portion}</Text>
            <View style={styles.itemMacros}>
              {[
                { label: 'Kcal', val: item.calories, key: 'calories' as const, color: colors.primary },
                { label: 'Protein', val: item.proteinG, key: 'proteinG' as const, color: '#A78BFA' },
                { label: 'Carbs', val: item.carbsG, key: 'carbsG' as const, color: '#FFCA6B' },
                { label: 'Fat', val: item.fatG, key: 'fatG' as const, color: '#F4A261' },
              ].map(m => (
                <View key={m.label} style={[styles.macroBox, { borderColor: m.color + '40', backgroundColor: m.color + '12' }]}>
                  <TextInput
                    style={[styles.macroVal, { color: m.color }]}
                    value={String(m.val)}
                    onChangeText={v => updateItem(i, { [m.key]: parseFloat(v) || 0 })}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.macroLbl, { color: colors.textMuted }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Add item button */}
        <TouchableOpacity
          onPress={() => setItems(prev => [...prev, { name: '', portion: '', calories: 0, proteinG: 0, carbsG: 0, fatG: 0, confidence: 'medium' }])}
          style={[styles.addItemBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="add" size={18} color={colors.textMuted} />
          <Text style={[styles.addItemTxt, { color: colors.textMuted }]}>Add Missing Food</Text>
        </TouchableOpacity>

        {/* Totals summary */}
        <View style={[styles.totalsCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.totalsTitle, { color: colors.navy }]}>Estimated Totals</Text>
          <View style={styles.totalsRow}>
            {[
              { label: 'Calories', val: totals.calories, color: colors.primary },
              { label: 'Protein', val: `${totals.proteinG}g`, color: '#A78BFA' },
              { label: 'Carbs', val: `${totals.carbsG}g`, color: '#FFCA6B' },
              { label: 'Fat', val: `${totals.fatG}g`, color: '#F4A261' },
            ].map(t => (
              <View key={t.label} style={styles.totalItem}>
                <Text style={[styles.totalVal, { color: t.color }]}>{t.val}</Text>
                <Text style={[styles.totalLabel, { color: colors.textMuted }]}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  navBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveTxt: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  scroll: { paddingHorizontal: 18, paddingTop: 16 },
  emptyTxt: { fontSize: 16, fontFamily: 'Nunito_600SemiBold' },
  visionHero: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 16, gap: 12 },
  heroPhoto: { width: '100%', height: 180, borderRadius: 12 },
  nimbusLabel: { fontSize: 9, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1.5, textTransform: 'uppercase' },
  nimbusNote: { fontSize: 13, fontFamily: 'Nunito_400Regular', lineHeight: 18, fontStyle: 'italic', marginTop: 2 },
  sectionLabel: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  mealNameInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 16 },
  itemCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  itemName: { flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold' },
  itemPortion: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginBottom: 10 },
  itemMacros: { flexDirection: 'row', gap: 8 },
  macroBox: { flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 8, gap: 2 },
  macroVal: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center', width: '100%' },
  macroLbl: { fontSize: 9, fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 12, marginBottom: 16 },
  addItemTxt: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  totalsCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 8 },
  totalsTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold', marginBottom: 12, textAlign: 'center' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center', gap: 2 },
  totalVal: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  totalLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
});
