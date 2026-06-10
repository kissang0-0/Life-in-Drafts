import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'lid_lights_out_v1';

export type SleepQuality = 'poor' | 'okay' | 'good' | 'excellent';

export type SleepLog = {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number;
  quality: SleepQuality;
  notes: string;
  dreams: string;
  timestamp: string;
};

export type LightsOutStore = {
  logs: SleepLog[];
  streakDays: number;
  bestStreak: number;
  lastLogDate: string;
};

const DEFAULT_STORE: LightsOutStore = {
  logs: [],
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

export async function loadLightsOut(): Promise<LightsOutStore> {
  const raw = await getRaw();
  if (!raw) return { ...DEFAULT_STORE };
  try { return { ...DEFAULT_STORE, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_STORE }; }
}

export async function saveLightsOut(data: LightsOutStore): Promise<void> {
  await setRaw(JSON.stringify(data));
}

export function todayLOStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function calcDurationMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return wakeMins - bedMins;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function getQualityMeta(q: SleepQuality): { emoji: string; label: string; color: string; stars: number } {
  switch (q) {
    case 'poor':      return { emoji: '😴', label: 'Poor',      color: '#8B9DC3', stars: 1 };
    case 'okay':      return { emoji: '🌙', label: 'Okay',      color: '#7EC8E3', stars: 2 };
    case 'good':      return { emoji: '✨', label: 'Good',      color: '#C9AEED', stars: 3 };
    case 'excellent': return { emoji: '💫', label: 'Excellent', color: '#FFD700', stars: 4 };
  }
}

export function getAverageSleep(logs: SleepLog[]): number {
  if (logs.length === 0) return 0;
  return Math.round(logs.reduce((s, l) => s + l.durationMinutes, 0) / logs.length);
}

export function updateLoStreak(store: LightsOutStore, date: string): LightsOutStore {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = yesterday.toISOString().split('T')[0];
  let streak = store.streakDays;
  if (store.lastLogDate === yd) streak += 1;
  else if (store.lastLogDate !== date) streak = 1;
  return {
    ...store,
    streakDays: streak,
    bestStreak: Math.max(store.bestStreak, streak),
    lastLogDate: date,
  };
}

export function getNimbusNightNote(quality?: SleepQuality): string {
  if (!quality) return 'Rest is also part of becoming. 🌙';
  switch (quality) {
    case 'poor':      return 'You might feel a bit tired today. Be gentle with yourself. 💙';
    case 'okay':      return 'A quiet night still counts. You showed up for rest. 🌙';
    case 'good':      return 'A good night makes tomorrow feel a little lighter. ✨';
    case 'excellent': return 'You rested beautifully. Your body and mind thank you. 💫';
  }
}
