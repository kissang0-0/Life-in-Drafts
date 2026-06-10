import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Gender, ActivityLevel, GoalType } from './forkcastCalc';

const KEY = 'lid_forkcast_v1';

export type ForkcastProfile = {
  age: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  bmr: number;
  maintenanceCals: number;
  targetCals: number;
  proteinGoalG: number;
  waterGoalGlasses: number;
  setupComplete: boolean;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';

export type MealEntry = {
  id: string;
  date: string;
  type: MealType;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  photoUri?: string;
  notes?: string;
  mood?: string;
  worthIt?: string;
  timestamp: string;
};

export type WeightCheckin = {
  id: string;
  date: string;
  weightKg: number;
  notes?: string;
};

export type WaterLog = { date: string; glasses: number };

export type ForkcastStore = {
  profile: ForkcastProfile;
  meals: MealEntry[];
  weightCheckins: WeightCheckin[];
  waterLogs: WaterLog[];
  favoriteMealIds: string[];
};

export const DEFAULT_PROFILE: ForkcastProfile = {
  age: 0, heightCm: 0, currentWeightKg: 0, goalWeightKg: 0,
  gender: 'female', activityLevel: 'moderate', goalType: 'lose',
  bmr: 0, maintenanceCals: 0, targetCals: 1500, proteinGoalG: 100,
  waterGoalGlasses: 8, setupComplete: false,
};

const DEFAULT_STORE: ForkcastStore = {
  profile: DEFAULT_PROFILE,
  meals: [],
  weightCheckins: [],
  waterLogs: [],
  favoriteMealIds: [],
};

async function getRaw(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(KEY);
    return await SecureStore.getItemAsync(KEY);
  } catch { return null; }
}

async function setRaw(v: string): Promise<void> {
  try {
    if (Platform.OS === 'web') { localStorage.setItem(KEY, v); return; }
    await SecureStore.setItemAsync(KEY, v);
  } catch {}
}

export async function loadForkcast(): Promise<ForkcastStore> {
  const raw = await getRaw();
  if (!raw) return { ...DEFAULT_STORE, profile: { ...DEFAULT_PROFILE } };
  try { return { ...DEFAULT_STORE, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_STORE, profile: { ...DEFAULT_PROFILE } }; }
}

export async function saveForkcast(data: ForkcastStore): Promise<void> {
  await setRaw(JSON.stringify(data));
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMealsForDate(meals: MealEntry[], date: string): MealEntry[] {
  return meals.filter(m => m.date === date);
}

export function getWaterForDate(logs: WaterLog[], date: string): number {
  return logs.find(l => l.date === date)?.glasses ?? 0;
}

export function sumNutrition(meals: MealEntry[]): { calories: number; proteinG: number; carbsG: number; fatG: number } {
  return meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    proteinG: acc.proteinG + (m.proteinG || 0),
    carbsG:   acc.carbsG   + (m.carbsG   || 0),
    fatG:     acc.fatG     + (m.fatG     || 0),
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
}
