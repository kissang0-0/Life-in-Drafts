import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'lid_sip_happens_v1';

export type WaterUnit = 'glass' | 'bottle500' | 'bottle750' | 'bottle1000' | 'custom';

export type SipLog = {
  id: string;
  date: string;
  ml: number;
  unit: WaterUnit;
  timestamp: string;
};

export type SipDayRecord = {
  date: string;
  logs: SipLog[];
};

export type SipStore = {
  goalGlasses: number;
  glassML: number;
  days: SipDayRecord[];
  streakDays: number;
  bestStreak: number;
  lastLogDate: string;
};

const DEFAULT_STORE: SipStore = {
  goalGlasses: 8,
  glassML: 250,
  days: [],
  streakDays: 0,
  bestStreak: 0,
  lastLogDate: '',
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

export async function loadSip(): Promise<SipStore> {
  const raw = await getRaw();
  if (!raw) return { ...DEFAULT_STORE };
  try { return { ...DEFAULT_STORE, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_STORE }; }
}

export async function saveSip(data: SipStore): Promise<void> {
  await setRaw(JSON.stringify(data));
}

export function todaySipStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodayRecord(days: SipDayRecord[], date: string): SipDayRecord {
  return days.find(d => d.date === date) ?? { date, logs: [] };
}

export function getTotalMLForDay(record: SipDayRecord): number {
  return record.logs.reduce((sum, l) => sum + l.ml, 0);
}

export function mlToGlasses(ml: number, glassML: number): number {
  return glassML > 0 ? ml / glassML : 0;
}

export function unitToML(unit: WaterUnit, customML = 0, glassML = 250): number {
  switch (unit) {
    case 'glass':      return glassML;
    case 'bottle500':  return 500;
    case 'bottle750':  return 750;
    case 'bottle1000': return 1000;
    case 'custom':     return customML;
    default:           return glassML;
  }
}

export function getCloudStatus(glasses: number, goal: number): { emoji: string; label: string; color: string } {
  const pct = goal > 0 ? glasses / goal : 0;
  if (pct === 0)       return { emoji: '🌑', label: 'Thirsty Cloud',     color: '#B0C4DE' };
  if (pct < 0.25)      return { emoji: '☁️',  label: 'Tiny Drizzle',      color: '#90BFDA' };
  if (pct < 0.5)       return { emoji: '🌤️',  label: 'Partly Rainy',      color: '#7EC8E3' };
  if (pct < 0.75)      return { emoji: '⛅',  label: 'Gathering Clouds',  color: '#5BAFD6' };
  if (pct < 1)         return { emoji: '🌧️',  label: 'Almost There!',     color: '#4A9FC8' };
  return               { emoji: '🌈',  label: 'Fully Hydrated!',    color: '#3D8FBF' };
}

export function updateStreak(store: SipStore, date: string): SipStore {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = yesterday.toISOString().split('T')[0];

  let streak = store.streakDays;
  if (store.lastLogDate === yd) {
    streak = streak + 1;
  } else if (store.lastLogDate !== date) {
    streak = 1;
  }

  return {
    ...store,
    streakDays: streak,
    bestStreak: Math.max(store.bestStreak, streak),
    lastLogDate: date,
  };
}
