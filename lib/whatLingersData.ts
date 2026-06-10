import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'lid_what_lingers_v1';

export type LogType = 'action' | 'urge';

export type EmotionalState =
  | 'overwhelmed'
  | 'stressed'
  | 'bored'
  | 'social'
  | 'tired'
  | 'neutral'
  | 'anxious'
  | 'sad';

export type LingerLog = {
  id: string;
  date: string;
  timestamp: string;
  type: LogType;
  what: string;
  emotionalState: EmotionalState;
  intensity: number;
  notes: string;
  hourOfDay: number;
};

export type WeeklyPattern = {
  weekStart: string;
  commonHours: number[];
  commonStates: EmotionalState[];
  logCount: number;
};

export type WhatLingersStore = {
  logs: LingerLog[];
  lastReflectionDate: string;
};

const DEFAULT_STORE: WhatLingersStore = {
  logs: [],
  lastReflectionDate: '',
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

export async function loadLingers(): Promise<WhatLingersStore> {
  const raw = await getRaw();
  if (!raw) return { ...DEFAULT_STORE };
  try { return { ...DEFAULT_STORE, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_STORE }; }
}

export async function saveLingers(data: WhatLingersStore): Promise<void> {
  await setRaw(JSON.stringify(data));
}

export function todayWLStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getStateMeta(state: EmotionalState): { label: string; emoji: string; color: string } {
  switch (state) {
    case 'overwhelmed': return { label: 'Overwhelmed', emoji: '🌊', color: '#7EC8E3' };
    case 'stressed':    return { label: 'Stressed',    emoji: '⚡', color: '#FFCA6B' };
    case 'bored':       return { label: 'Bored',       emoji: '🌫️', color: '#B0C4DE' };
    case 'social':      return { label: 'Social',      emoji: '🌀', color: '#C9AEED' };
    case 'tired':       return { label: 'Tired',       emoji: '🌙', color: '#8B9DC3' };
    case 'neutral':     return { label: 'Neutral',     emoji: '🍃', color: '#98D4A3' };
    case 'anxious':     return { label: 'Anxious',     emoji: '🌪️', color: '#F4A261' };
    case 'sad':         return { label: 'Sad',         emoji: '🩵', color: '#7EC8E3' };
  }
}

export function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function getRecentLogs(logs: LingerLog[], days = 7): LingerLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return logs.filter(l => l.date >= cutoffStr);
}

export function getMostCommonHour(logs: LingerLog[]): number | null {
  if (logs.length === 0) return null;
  const counts: Record<number, number> = {};
  logs.forEach(l => { counts[l.hourOfDay] = (counts[l.hourOfDay] ?? 0) + 1; });
  return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

export function getMostCommonState(logs: LingerLog[]): EmotionalState | null {
  if (logs.length === 0) return null;
  const counts: Record<string, number> = {};
  logs.forEach(l => { counts[l.emotionalState] = (counts[l.emotionalState] ?? 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as EmotionalState;
}

export function isNightTime(hour: number): boolean {
  return hour >= 21 || hour < 5;
}

export function getNimbusLingerResponse(log: LingerLog, totalLogs: number): string {
  const isNight = isNightTime(log.hourOfDay);
  const state = getStateMeta(log.emotionalState);

  if (log.type === 'urge') {
    return "I'm here. Do you want to sit with this feeling for a moment before deciding anything?";
  }

  if (isNight) {
    if (totalLogs > 3) return `Late hours again. This time of day shows up often for you.`;
    return "Logged. Nights can feel heavy sometimes.";
  }

  const curiosityQuestions = [
    "Do you remember what was happening right before that moment?",
    "What do you think you were needing in that moment?",
    "Was it more physical urge or emotional release?",
    "Did it feel intentional or automatic?",
    `It seems to show up when you feel ${state.label.toLowerCase()}. Has that been building today?`,
  ];

  const q = curiosityQuestions[totalLogs % curiosityQuestions.length];
  return `Logged. ${q}`;
}

export function getWeeklyReflection(logs: LingerLog[]): string | null {
  if (logs.length < 3) return null;
  const commonHour = getMostCommonHour(logs);
  const commonState = getMostCommonState(logs);
  const stateMeta = commonState ? getStateMeta(commonState) : null;
  const hourStr = commonHour !== null ? formatHour(commonHour) : null;

  let reflection = `This week I noticed a few repeating moments. `;
  if (hourStr) reflection += `Around ${hourStr} seems to be your most common time. `;
  if (stateMeta) reflection += `It often appears when you feel ${stateMeta.label.toLowerCase()} ${stateMeta.emoji}. `;
  reflection += `I'm not here to change anything. Just to help you see it clearly.`;
  return reflection;
}

export function getPatternInsight(logs: LingerLog[]): string | null {
  if (logs.length < 5) return null;
  const nightLogs = logs.filter(l => isNightTime(l.hourOfDay));
  const nightPct = nightLogs.length / logs.length;
  if (nightPct > 0.6) {
    return "Your nights seem heavier than your days lately.";
  }
  const commonState = getMostCommonState(logs);
  if (commonState && commonState !== 'neutral') {
    const meta = getStateMeta(commonState);
    return `This often seems linked to feeling ${meta.label.toLowerCase()} ${meta.emoji} — not randomness.`;
  }
  return "There's a pattern forming. You don't seem to be choosing these moments randomly.";
}
