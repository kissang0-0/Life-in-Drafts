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
import {
  calcBMR, calcMaintenance, calcTarget, calcProteinGoal,
  type Gender, type ActivityLevel, type GoalType,
} from '@/lib/forkcastCalc';
import { loadForkcast, saveForkcast, type ForkcastProfile } from '@/lib/forkcastData';

const STEPS = ['About You', 'Your Body', 'Your Goal'];

type Option<T extends string> = { label: string; value: T; emoji: string };

const GENDERS: Option<Gender>[] = [
  { label: 'Female', value: 'female', emoji: '🌸' },
  { label: 'Male',   value: 'male',   emoji: '💙' },
  { label: 'Other',  value: 'other',  emoji: '🌈' },
];

const ACTIVITIES: Option<ActivityLevel>[] = [
  { label: 'Mostly sitting',  value: 'sedentary',   emoji: '🛋️' },
  { label: 'Light exercise',  value: 'light',       emoji: '🚶' },
  { label: 'Moderate exercise', value: 'moderate',  emoji: '🏃' },
  { label: 'Very active',     value: 'active',      emoji: '🏋️' },
  { label: 'Athlete level',   value: 'very_active', emoji: '⚡' },
];

const GOALS: Option<GoalType>[] = [
  { label: 'Lose Weight',     value: 'lose',     emoji: '🌸' },
  { label: 'Maintain Weight', value: 'maintain', emoji: '⚖️' },
  { label: 'Gain Weight',     value: 'gain',     emoji: '💪' },
];

function OptionBtn<T extends string>({
  item, selected, onPress, color,
}: { item: Option<T>; selected: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        obStyles.btn,
        { borderColor: selected ? color : '#E2E8F0', backgroundColor: selected ? color + '18' : '#fff' },
      ]}
    >
      <Text style={obStyles.emoji}>{item.emoji}</Text>
      <Text style={[obStyles.label, { color: selected ? color : '#374151' }]}>{item.label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={18} color={color} style={{ marginLeft: 'auto' }} />}
    </TouchableOpacity>
  );
}
const obStyles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 8 },
  emoji: { fontSize: 20 },
  label: { fontSize: 14, fontFamily: 'Nunito_700Bold', flex: 1 },
});

function NumInput({ label, value, onChangeText, suffix, placeholder }: {
  label: string; value: string; onChangeText: (v: string) => void; suffix?: string; placeholder?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[niStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={[niStyles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[niStyles.input, { color: colors.navy }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '0'}
          placeholderTextColor={colors.textLight}
          keyboardType="decimal-pad"
        />
        {!!suffix && <Text style={[niStyles.suffix, { color: colors.textMuted }]}>{suffix}</Text>}
      </View>
    </View>
  );
}
const niStyles = StyleSheet.create({
  label: { fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 16, fontFamily: 'Nunito_600SemiBold', paddingVertical: 12 },
  suffix: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
});

export default function ForkcastSetup() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [step, setStep] = useState(0);
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<GoalType>('lose');
  const [saving, setSaving] = useState(false);

  const next = () => {
    if (step === 0) {
      if (!age || !gender) return Alert.alert('', 'Please fill in all fields');
    }
    if (step === 1) {
      if (!heightCm || !currentWeight || !goalWeight) return Alert.alert('', 'Please fill in all fields');
    }
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    handleSave();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ageN = parseFloat(age);
      const htN  = parseFloat(heightCm);
      const cwN  = parseFloat(currentWeight);
      const gwN  = parseFloat(goalWeight);

      const bmr = calcBMR(cwN, htN, ageN, gender);
      const maintenance = calcMaintenance(bmr, activity);
      const target = calcTarget(maintenance, goal);
      const proteinGoal = calcProteinGoal(gwN);

      const profile: ForkcastProfile = {
        age: ageN, heightCm: htN, currentWeightKg: cwN, goalWeightKg: gwN,
        gender, activityLevel: activity, goalType: goal,
        bmr, maintenanceCals: maintenance, targetCals: target,
        proteinGoalG: proteinGoal, waterGoalGlasses: 8, setupComplete: true,
      };

      const store = await loadForkcast();
      await saveForkcast({ ...store, profile });
      router.replace('/(tabs)/forkcast' as any);
    } catch (e) {
      Alert.alert('Error', 'Could not save. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.navy} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>FORKCAST SETUP</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.dot, { backgroundColor: i <= step ? colors.primary : colors.borderLight, width: i === step ? 24 : 8 }]} />
          ))}
        </View>

        {/* Nimbus intro */}
        <LinearGradient colors={[colors.primary, colors.lavenderDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <NimbusBird size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.heroTitle}>Step {step + 1}: {STEPS[step]}</Text>
            <Text style={styles.heroSub}>
              {step === 0 && "Let's get to know you a little! This helps me calculate your needs accurately."}
              {step === 1 && "Tell me about your body. All information stays private on your device."}
              {step === 2 && "What's your goal? No judgment here — just support."}
            </Text>
          </View>
        </LinearGradient>

        {/* Step 0: About You */}
        {step === 0 && (
          <View style={styles.section}>
            <NumInput label="Age" value={age} onChangeText={setAge} suffix="years" placeholder="e.g. 21" />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Gender</Text>
            {GENDERS.map(g => (
              <OptionBtn key={g.value} item={g} selected={gender === g.value} onPress={() => setGender(g.value)} color={colors.primary} />
            ))}
          </View>
        )}

        {/* Step 1: Body */}
        {step === 1 && (
          <View style={styles.section}>
            <NumInput label="Height" value={heightCm} onChangeText={setHeightCm} suffix="cm" placeholder="e.g. 165" />
            <NumInput label="Current Weight" value={currentWeight} onChangeText={setCurrentWeight} suffix="kg" placeholder="e.g. 70" />
            <NumInput label="Goal Weight" value={goalWeight} onChangeText={setGoalWeight} suffix="kg" placeholder="e.g. 60" />
          </View>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Goal Type</Text>
            {GOALS.map(g => (
              <OptionBtn key={g.value} item={g} selected={goal === g.value} onPress={() => setGoal(g.value)} color={colors.lavenderDeep} />
            ))}
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 12 }]}>Activity Level</Text>
            {ACTIVITIES.map(a => (
              <OptionBtn key={a.value} item={a} selected={activity === a.value} onPress={() => setActivity(a.value)} color={colors.primary} />
            ))}
          </View>
        )}

        {/* Next / Save */}
        <TouchableOpacity
          onPress={next}
          disabled={saving}
          style={[styles.nextBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          activeOpacity={0.85}
        >
          <Text style={styles.nextTxt}>
            {saving ? 'Saving...' : step < STEPS.length - 1 ? 'Continue →' : "Let's Go! 🎉"}
          </Text>
        </TouchableOpacity>

        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.backLink}>
            <Text style={[styles.backLinkTxt, { color: colors.textMuted }]}>← Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4, width: 38 },
  eyebrow: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 2, textTransform: 'uppercase' },
  dotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 18, marginBottom: 20 },
  heroTitle: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  section: { marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  nextBtn: { borderRadius: 18, padding: 16, alignItems: 'center', marginTop: 12 },
  nextTxt: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  backLink: { alignItems: 'center', paddingVertical: 12 },
  backLinkTxt: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
});
