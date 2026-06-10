import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import NimbusBird from '@/components/NimbusBird';
import {
  loadForkcast, saveForkcast, todayStr, getMealsForDate,
  getWaterForDate, sumNutrition,
  type ForkcastStore, type MealEntry, type MealType,
} from '@/lib/forkcastData';
import { kgToLbs } from '@/lib/forkcastCalc';

const { width: SW } = Dimensions.get('window');

const MEAL_SECTIONS: { type: MealType; label: string; emoji: string; color: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🌅', color: '#FFCA6B' },
  { type: 'lunch',     label: 'Lunch',     emoji: '🥗', color: '#5DB87A' },
  { type: 'dinner',    label: 'Dinner',    emoji: '🍛', color: '#F4A261' },
  { type: 'snack',     label: 'Snacks',    emoji: '🍎', color: '#EF6C6C' },
  { type: 'drink',     label: 'Drinks',    emoji: '☕', color: '#7EC8E3' },
];

// ── Ring progress (simple arc via border trick) ─────────────────────────────
function CalRing({ pct, current, target, remaining, colors }: {
  pct: number; current: number; target: number; remaining: number; colors: any;
}) {
  const over = current > target;
  const ringColor = over ? '#EF6C6C' : colors.primary;
  const size = 160;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(1, pct) * circ;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      {/* Background ring */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: colors.borderLight,
      }} />
      {/* Progress ring hack using overflow */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: ringColor,
        borderTopColor: pct > 0.75 ? ringColor : 'transparent',
        borderRightColor: pct > 0.5  ? ringColor : 'transparent',
        borderBottomColor: pct > 0.25 ? ringColor : 'transparent',
        borderLeftColor: pct > 0     ? ringColor : 'transparent',
        transform: [{ rotate: '-90deg' }],
        opacity: 0.9,
      }} />
      {/* Center text */}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={{ fontSize: 28, fontFamily: 'Nunito_800ExtraBold', color: over ? '#EF6C6C' : colors.navy }}>
          {current.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: colors.textMuted }}>
          of {target.toLocaleString()} kcal
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: over ? '#EF6C6C' : '#5DB87A' }} />
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: over ? '#EF6C6C' : '#5DB87A' }}>
            {over ? `${(current - target).toLocaleString()} over` : `${remaining.toLocaleString()} left`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Blueberry protein jar ───────────────────────────────────────────────────
function ProteinJar({ current, goal, colors }: { current: number; goal: number; colors: any }) {
  const pct = Math.min(1, goal > 0 ? current / goal : 0);
  const jarH = 56;
  const fillH = jarH * pct;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: 48, height: jarH, borderRadius: 12, borderWidth: 2, borderColor: '#A78BFA', backgroundColor: '#F5F0FF', overflow: 'hidden', justifyContent: 'flex-end' }}>
        <View style={{ height: fillH, backgroundColor: '#A78BFA', borderRadius: 8 }} />
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 16 }}>🫐</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#A78BFA' }}>{current}g</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: colors.textMuted }}>Protein</Text>
      <Text style={{ fontSize: 9, fontFamily: 'Nunito_400Regular', color: colors.textLight }}>goal {goal}g</Text>
    </View>
  );
}

// ── Macro pill ──────────────────────────────────────────────────────────────
function MacroPill({ label, val, goal, color, emoji }: { label: string; val: number; goal?: number; color: string; emoji: string }) {
  const pct = goal ? Math.min(1, val / goal) : 0;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={{ fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color }}>{val}g</Text>
      {!!goal && (
        <View style={{ width: '90%', height: 5, borderRadius: 3, backgroundColor: color + '25', overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%` as any, height: '100%', backgroundColor: color, borderRadius: 3 }} />
        </View>
      )}
      <Text style={{ fontSize: 9, fontFamily: 'Nunito_700Bold', color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

// ── Water glasses ───────────────────────────────────────────────────────────
function WaterTracker({ glasses, goal, onTap, colors }: { glasses: number; goal: number; onTap: (n: number) => void; colors: any }) {
  return (
    <View style={[wtStyles.wrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={wtStyles.header}>
        <Text style={wtStyles.emoji}>💧</Text>
        <Text style={[wtStyles.title, { color: colors.navy }]}>Water</Text>
        <Text style={[wtStyles.count, { color: colors.primary }]}>{glasses}/{goal} glasses</Text>
      </View>
      <View style={wtStyles.glasses}>
        {Array.from({ length: goal }).map((_, i) => (
          <TouchableOpacity key={i} onPress={() => onTap(i + 1)} activeOpacity={0.7}>
            <Text style={{ fontSize: 22, opacity: i < glasses ? 1 : 0.25 }}>💧</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const wtStyles = StyleSheet.create({
  wrap: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emoji: { fontSize: 18 },
  title: { flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold' },
  count: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});

// ── Meal section ─────────────────────────────────────────────────────────────
function MealSection({
  type, label, emoji, color, items, onAdd, onDelete, colors,
}: {
  type: MealType; label: string; emoji: string; color: string;
  items: MealEntry[]; onAdd: () => void; onDelete: (id: string) => void; colors: any;
}) {
  const total = items.reduce((s, m) => s + m.calories, 0);
  return (
    <View style={[msStyles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={msStyles.sectionHeader}>
        <View style={[msStyles.iconWrap, { backgroundColor: color + '20' }]}>
          <Text style={{ fontSize: 18 }}>{emoji}</Text>
        </View>
        <Text style={[msStyles.sectionLabel, { color: colors.navy }]}>{label}</Text>
        {total > 0 && <Text style={[msStyles.sectionCal, { color: color }]}>{total} kcal</Text>}
        <TouchableOpacity onPress={onAdd} style={[msStyles.addBtn, { backgroundColor: color + '20' }]}>
          <Ionicons name="add" size={18} color={color} />
        </TouchableOpacity>
      </View>
      {items.map(m => (
        <View key={m.id} style={[msStyles.item, { borderTopColor: colors.borderLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={[msStyles.itemName, { color: colors.navy }]}>{m.name}</Text>
            <Text style={[msStyles.itemMacros, { color: colors.textMuted }]}>
              {m.calories} kcal
              {m.proteinG > 0 ? ` · ${m.proteinG}g protein` : ''}
              {m.mood ? ` · ${m.mood}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(m.id)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={14} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
const msStyles = StyleSheet.create({
  section: { borderRadius: 18, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold' },
  sectionCal: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  itemName: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  itemMacros: { fontSize: 11, fontFamily: 'Nunito_400Regular', marginTop: 2 },
});

// ── Weight card ─────────────────────────────────────────────────────────────
function WeightCard({ store, onCheckin, colors }: { store: ForkcastStore; onCheckin: () => void; colors: any }) {
  const { profile, weightCheckins } = store;
  const latest = weightCheckins.length > 0 ? weightCheckins[weightCheckins.length - 1] : null;
  const curr = latest?.weightKg ?? profile.currentWeightKg;
  const goal = profile.goalWeightKg;
  const diff = curr - goal;
  const start = profile.currentWeightKg;
  const totalNeeded = Math.abs(start - goal);
  const progress = totalNeeded > 0 ? Math.min(1, Math.abs(start - curr) / totalNeeded) : 0;

  return (
    <View style={[wcStyles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={wcStyles.header}>
        <Text style={{ fontSize: 18 }}>⚖️</Text>
        <Text style={[wcStyles.title, { color: colors.navy }]}>Weight Journey</Text>
        <TouchableOpacity onPress={onCheckin} style={[wcStyles.btn, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[wcStyles.btnTxt, { color: colors.primary }]}>Log</Text>
        </TouchableOpacity>
      </View>
      <View style={wcStyles.row}>
        <View style={wcStyles.stat}>
          <Text style={[wcStyles.statVal, { color: colors.navy }]}>{curr.toFixed(1)}</Text>
          <Text style={[wcStyles.statLbl, { color: colors.textMuted }]}>Current (kg)</Text>
        </View>
        <View style={[wcStyles.arrow]}>
          <Ionicons name={diff > 0 ? 'arrow-down' : 'arrow-up'} size={22} color={diff > 0 ? '#5DB87A' : '#A78BFA'} />
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: colors.textMuted, marginTop: 2 }}>
            {Math.abs(diff).toFixed(1)} kg to go
          </Text>
        </View>
        <View style={wcStyles.stat}>
          <Text style={[wcStyles.statVal, { color: colors.lavenderDeep }]}>{goal.toFixed(1)}</Text>
          <Text style={[wcStyles.statLbl, { color: colors.textMuted }]}>Goal (kg)</Text>
        </View>
      </View>
      <View style={[wcStyles.progressBar, { backgroundColor: colors.borderLight }]}>
        <View style={[wcStyles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: '#5DB87A' }]} />
      </View>
      <Text style={[wcStyles.progressTxt, { color: colors.textMuted }]}>
        {Math.round(progress * 100)}% toward your goal
      </Text>
    </View>
  );
}
const wcStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold' },
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  btnTxt: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 14 },
  stat: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold' },
  statLbl: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },
  arrow: { alignItems: 'center', gap: 2 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressTxt: { fontSize: 11, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
});

// ── Achievements ─────────────────────────────────────────────────────────────
const FORK_ACHIEVEMENTS = [
  { emoji: '🍓', label: 'First Meal', check: (s: ForkcastStore) => s.meals.length >= 1 },
  { emoji: '💧', label: 'Hydration Hero', check: (s: ForkcastStore) => s.waterLogs.some(w => w.glasses >= 8) },
  { emoji: '⚖️', label: 'Scale Check', check: (s: ForkcastStore) => s.weightCheckins.length >= 1 },
  { emoji: '🔥', label: '7-Day Logger', check: (s: ForkcastStore) => new Set(s.meals.map(m => m.date)).size >= 7 },
  { emoji: '🫐', label: 'Protein Goal', check: (s: ForkcastStore) => s.meals.some(m => m.date === todayStr() && m.proteinG >= s.profile.proteinGoalG) },
];

// ═══════════════════════════════════════════════════════════════════════════
// Main screen
// ═══════════════════════════════════════════════════════════════════════════
export default function ForkcastScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [store, setStore] = useState<ForkcastStore | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await loadForkcast();
    setStore(s);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const setWater = async (glasses: number) => {
    if (!store) return;
    const date = todayStr();
    const existing = store.waterLogs.filter(w => w.date !== date);
    const updated = { ...store, waterLogs: [...existing, { date, glasses }] };
    setStore(updated);
    await saveForkcast(updated);
  };

  const deleteMeal = async (id: string) => {
    if (!store) return;
    const updated = { ...store, meals: store.meals.filter(m => m.id !== id) };
    setStore(updated);
    await saveForkcast(updated);
  };

  if (!store) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!store.profile.setupComplete) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
          <NimbusBird size={80} />
          <Text style={[styles.emptyTitle, { color: colors.navy }]}>Welcome to Forkcast</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Food, fuel & feelings — all in one place. Let's set up your nutrition profile first!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/forkcast/setup' as any)}
            style={[styles.setupBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.setupBtnTxt}>Set Up Forkcast 🍓</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const today = todayStr();
  const todayMeals = getMealsForDate(store.meals, today);
  const nutrition = sumNutrition(todayMeals);
  const water = getWaterForDate(store.waterLogs, today);
  const { targetCals, proteinGoalG, waterGoalGlasses } = store.profile;
  const remaining = Math.max(0, targetCals - nutrition.calories);
  const calPct = targetCals > 0 ? nutrition.calories / targetCals : 0;

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>FORKCAST</Text>
            <Text style={[styles.dateLabel, { color: colors.navy }]}>{dateLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/forkcast/weight-checkin' as any)} style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={{ fontSize: 16 }}>⚖️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/forkcast/setup' as any)} style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, marginLeft: 6 }]}>
            <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Daily overview card */}
        <LinearGradient
          colors={[colors.primary + 'F0', colors.lavenderDeep + 'D0']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.overviewCard}
        >
          <View style={{ alignItems: 'center' }}>
            <CalRing
              pct={calPct}
              current={nutrition.calories}
              target={targetCals}
              remaining={remaining}
              colors={{ ...colors, primary: '#fff', textMuted: 'rgba(255,255,255,0.7)', navy: '#fff', borderLight: 'rgba(255,255,255,0.2)' }}
            />
          </View>
          <View style={styles.macroRow}>
            <ProteinJar current={nutrition.proteinG} goal={proteinGoalG} colors={{ ...colors, textMuted: 'rgba(255,255,255,0.75)', textLight: 'rgba(255,255,255,0.5)' }} />
            <View style={[styles.macroDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <MacroPill label="Carbs" val={nutrition.carbsG} color="rgba(255,204,80,0.9)" emoji="🍞" />
            <MacroPill label="Fat" val={nutrition.fatG} color="rgba(244,162,97,0.9)" emoji="🥑" />
            <View style={[styles.macroDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 16 }}>💧</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: 'rgba(255,255,255,0.9)' }}>{water}</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Nunito_700Bold', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Glasses</Text>
            </View>
          </View>
          {/* Nimbus tip */}
          <View style={[styles.nimbusTip, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <NimbusBird size={24} />
            <Text style={styles.nimbusTipTxt}>
              {nutrition.calories === 0
                ? "Start logging to see your progress today! 🌸"
                : remaining > 0
                ? `${remaining} calories remaining — you're doing great! ✦`
                : "You've hit your calorie goal for today! 🎉"}
            </Text>
          </View>
        </LinearGradient>

        {/* Water tracker */}
        <WaterTracker glasses={water} goal={waterGoalGlasses} onTap={setWater} colors={colors} />

        {/* Meal sections */}
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Today's Meals</Text>
        {MEAL_SECTIONS.map(ms => (
          <MealSection
            key={ms.type}
            {...ms}
            items={todayMeals.filter(m => m.type === ms.type)}
            onAdd={() => router.push({ pathname: '/forkcast/log-meal', params: { type: ms.type } } as any)}
            onDelete={deleteMeal}
            colors={colors}
          />
        ))}

        {/* Quick log FAB row */}
        <TouchableOpacity
          onPress={() => router.push('/forkcast/log-meal' as any)}
          style={[styles.logBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.logBtnTxt}>Log a Meal</Text>
          <Text style={styles.logBtnSub}>or use Nimbus Vision ✨</Text>
        </TouchableOpacity>

        {/* Weight journey */}
        <WeightCard store={store} onCheckin={() => router.push('/forkcast/weight-checkin' as any)} colors={colors} />

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {FORK_ACHIEVEMENTS.map(a => {
              const earned = a.check(store);
              return (
                <View key={a.label} style={[styles.achieveCard, {
                  backgroundColor: earned ? colors.accent + '20' : colors.surface,
                  borderColor: earned ? colors.accentDeep + '40' : colors.borderLight,
                  opacity: earned ? 1 : 0.5,
                }]}>
                  <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                  <Text style={[styles.achieveLabel, { color: colors.navy }]}>{a.label}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Text style={[styles.brand, { color: colors.textLight }]}>Forkcast · Food, Fuel & Feelings</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  eyebrow: { fontSize: 9, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 2, textTransform: 'uppercase' },
  dateLabel: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  overviewCard: { borderRadius: 24, padding: 20, marginBottom: 14, gap: 16 },
  macroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  macroDivider: { width: 1, height: 60 },
  nimbusTip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
  },
  nimbusTipTxt: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', marginBottom: 10, marginTop: 4 },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 18, paddingVertical: 16, marginBottom: 14,
  },
  logBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  logBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Nunito_400Regular' },
  achieveCard: { alignItems: 'center', gap: 6, padding: 14, borderRadius: 18, borderWidth: 1, width: 90 },
  achieveLabel: { fontSize: 10, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  brand: { fontSize: 11, fontFamily: 'Nunito_400Regular', textAlign: 'center', letterSpacing: 0.5, marginTop: 8 },
  emptyTitle: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 22 },
  setupBtn: { borderRadius: 18, paddingHorizontal: 28, paddingVertical: 16 },
  setupBtnTxt: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
});
