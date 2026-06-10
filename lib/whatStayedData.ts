import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'lid_what_stayed_v2';

export type MoodTag =
  | 'calm' | 'happy' | 'sad' | 'nostalgic'
  | 'bittersweet' | 'grateful' | 'tired' | 'hopeful' | 'neutral';

export type MemoryPhoto = {
  id: string;
  photoUri: string;
  caption: string;
  mood: MoodTag;
  date: string;
  timestamp: string;
};

export type WhatStayedStore = {
  photos: MemoryPhoto[];
};

const DEFAULT: WhatStayedStore = { photos: [] };

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

export async function loadStayed(): Promise<WhatStayedStore> {
  const raw = await getRaw();
  if (!raw) return { ...DEFAULT };
  try { return { ...DEFAULT, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT }; }
}

export async function saveStayed(data: WhatStayedStore): Promise<void> {
  await setRaw(JSON.stringify(data));
}

export function todayStayedStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatMemoryDate(isoOrDate: string): string {
  const d = isoOrDate.includes('T') ? new Date(isoOrDate) : new Date(isoOrDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getMoodMeta(mood: MoodTag): { label: string; emoji: string; color: string } {
  switch (mood) {
    case 'calm':        return { label: 'Calm',        emoji: '🌿', color: '#7EC8A0' };
    case 'happy':       return { label: 'Happy',       emoji: '☀️', color: '#FFCA6B' };
    case 'sad':         return { label: 'Sad',         emoji: '🩵', color: '#7EC8E3' };
    case 'nostalgic':   return { label: 'Nostalgic',   emoji: '🍂', color: '#C9A87C' };
    case 'bittersweet': return { label: 'Bittersweet', emoji: '🌫️', color: '#B0B8D0' };
    case 'grateful':    return { label: 'Grateful',    emoji: '🌸', color: '#E8A0C0' };
    case 'tired':       return { label: 'Tired',       emoji: '🌙', color: '#8B9DC3' };
    case 'hopeful':     return { label: 'Hopeful',     emoji: '✨', color: '#C9AEED' };
    case 'neutral':     return { label: 'Neutral',     emoji: '🍃', color: '#98D4A3' };
  }
}

export const ALL_MOODS: MoodTag[] = [
  'calm', 'happy', 'sad', 'nostalgic',
  'bittersweet', 'grateful', 'tired', 'hopeful', 'neutral',
];
