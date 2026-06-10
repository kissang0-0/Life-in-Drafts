import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import { loadForkcast, saveForkcast, todayStr, type WeightCheckin } from '@/lib/forkcastData';
import { kgToLbs } from '@/lib/forkcastCalc';

export default function WeightCheckinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [useKg, setUseKg] = useState(true);
  const [saving, setSaving] = useState(false);

  const displayWeight = weight ? (useKg ? `${weight} kg` : `${weight} lbs ≈ ${(parseFloat(weight) / 2.2046).toFixed(1)} kg`) : '';

  const handleSave = async () => {
    const val = parseFloat(weight);
    if (!val || val < 20 || val > 400) return Alert.alert('', 'Please enter a valid weight.');
    setSaving(true);
    try {
      const store = await loadForkcast();
      const weightKg = useKg ? val : parseFloat((val / 2.2046).toFixed(1));
      const checkin: WeightCheckin = {
        id: Date.now().toString(),
        date: todayStr(),
        weightKg,
        notes: notes.trim() || undefined,
      };
      const existing = store.weightCheckins.filter(w => w.date !== todayStr());
      await saveForkcast({ ...store, weightCheckins: [...existing, checkin] });
      router.canGoBack() ? router.back() : router.replace('/(tabs)/forkcast' as any);
    } catch {
      Alert.alert('Error', 'Could not save check-in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/forkcast' as any)} style={styles.navBtn}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]}>Weight Check-in</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 60 : insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[colors.primary + 'CC', colors.lavenderDeep + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <NimbusBird size={52} />
          <View style={{ gap: 4 }}>
            <Text style={styles.heroTitle}>Today's Check-in</Text>
            <Text style={styles.heroDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            <Text style={styles.heroNote}>Every check-in is progress. You're showing up for yourself. 🌸</Text>
          </View>
        </LinearGradient>

        {/* Unit toggle */}
        <View style={[styles.unitRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => setUseKg(true)} style={[styles.unitBtn, useKg && { backgroundColor: colors.primary }]}>
            <Text style={[styles.unitTxt, { color: useKg ? '#fff' : colors.textMuted }]}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setUseKg(false)} style={[styles.unitBtn, !useKg && { backgroundColor: colors.primary }]}>
            <Text style={[styles.unitTxt, { color: !useKg ? '#fff' : colors.textMuted }]}>lbs</Text>
          </TouchableOpacity>
        </View>

        {/* Weight input */}
        <View style={[styles.weightInputWrap, { borderColor: colors.primary + '40', backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.weightInput, { color: colors.navy }]}
            value={weight}
            onChangeText={setWeight}
            placeholder="0.0"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Text style={[styles.weightUnit, { color: colors.textMuted }]}>{useKg ? 'kg' : 'lbs'}</Text>
        </View>

        {!!displayWeight && (
          <Text style={[styles.displayWeight, { color: colors.primary }]}>{displayWeight}</Text>
        )}

        {/* Notes */}
        <TextInput
          style={[styles.notesInput, { color: colors.navy, backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          placeholder="Add a note (optional)... How are you feeling?"
          placeholderTextColor={colors.textLight}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          activeOpacity={0.85}
        >
          <Text style={styles.saveTxt}>{saving ? 'Saving...' : 'Log Weight ✓'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  navBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 20, marginBottom: 20 },
  heroTitle: { color: '#fff', fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  heroDate:  { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  heroNote:  { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Nunito_400Regular', marginTop: 4 },
  unitRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 20, alignSelf: 'center' },
  unitBtn: { paddingHorizontal: 28, paddingVertical: 10 },
  unitTxt: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 2, paddingHorizontal: 24, marginBottom: 8, alignSelf: 'center' },
  weightInput: { fontSize: 56, fontFamily: 'Nunito_800ExtraBold', width: 160, textAlign: 'center' },
  weightUnit: { fontSize: 20, fontFamily: 'Nunito_600SemiBold' },
  displayWeight: { textAlign: 'center', fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 20 },
  notesInput: { borderRadius: 16, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: 'Nunito_400Regular', minHeight: 80, marginBottom: 20, textAlignVertical: 'top' },
  saveBtn: { borderRadius: 18, padding: 16, alignItems: 'center', marginBottom: 12 },
  saveTxt: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
});
