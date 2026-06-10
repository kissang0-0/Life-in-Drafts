import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'lid_barefaced_v1';

export type SkinCondition = 'calm' | 'hydrated' | 'breakingout' | 'dry' | 'glowing' | 'sensitive';

export type RoutineStep = {
  id: string;
  label: string;
  done: boolean;
};

export type DayLog = {
  date: string;
  skinCondition: SkinCondition | null;
  morningDone: boolean;
  nightDone: boolean;
  morningSteps: RoutineStep[];
  nightSteps: RoutineStep[];
  notes: string;
};

export type BarefacedStore = {
  logs: DayLog[];
  morningStreak: number;
  nightStreak: number;
  bestMorningStreak: number;
  bestNightStreak: number;
  lastMorningDate: string;
  lastNightDate: string;
};

const DEFAULT_MORNING_STEPS: Omit<RoutineStep, 'done'>[] = [
  { id: 'cleanser',    label: 'Cleanser'    },
  { id: 'toner',       label: 'Toner'       },
  { id: 'serum',       label: 'Serum'       },
  { id: 'moisturizer', label: 'Moisturizer' },
  { id: 'sunscreen',   label: 'Sunscreen'   },
];

const DEFAULT_NIGHT_STEPS: Omit<RoutineStep, 'done'>[] = [
  { id: 'makeup',      label: 'Makeup removal' },
  { id: 'cleanser',    label: 'Cleanser'        },
  { id: 'treatment',   label: 'Treatment'       },
  { id: 'moisturizer', label: 'Moisturizer'     },
];

export function freshMorningSteps(): RoutineStep[] {
  return DEFAULT_MORNING_STEPS.map(s => ({ ...s, done: false }));
}

export function freshNightSteps(): RoutineStep[] {
  return DEFAULT_NIGHT_STEPS.map(s => ({ ...s, done: false }));
}

const DEFAULT_STORE: BarefacedStore = {
  logs: [],
  morningStreak: 0,
  nightStreak: 0,
  bestMorningStreak: 0,
  bestNightStreak: 0,
  lastMorningDate: '',
  lastNightDate: '',
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

export async function loadBarefaced(): Promise<BarefacedStore> {
  const raw = await getRaw();
  if (!raw) return { ...DEFAULT_STORE };
  try { return { ...DEFAULT_STORE, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_STORE }; }
}

export async function saveBarefaced(data: BarefacedStore): Promise<void> {
  await setRaw(JSON.stringify(data));
}

export function todayBFStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodayLog(store: BarefacedStore): DayLog {
  const today = todayBFStr();
  const existing = store.logs.find(l => l.date === today);
  if (existing) return existing;
  return {
    date: today,
    skinCondition: null,
    morningDone: false,
    nightDone: false,
    morningSteps: freshMorningSteps(),
    nightSteps: freshNightSteps(),
    notes: '',
  };
}

export function upsertTodayLog(store: BarefacedStore, log: DayLog): BarefacedStore {
  const today = todayBFStr();
  const filtered = store.logs.filter(l => l.date !== today);
  return { ...store, logs: [log, ...filtered] };
}

export function updateBFStreaks(store: BarefacedStore, morning: boolean, night: boolean): BarefacedStore {
  const today = todayBFStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = yesterday.toISOString().split('T')[0];

  let ms = store.morningStreak;
  let ns = store.nightStreak;

  if (morning) {
    if (store.lastMorningDate === yd) ms += 1;
    else if (store.lastMorningDate !== today) ms = 1;
  }
  if (night) {
    if (store.lastNightDate === yd) ns += 1;
    else if (store.lastNightDate !== today) ns = 1;
  }

  return {
    ...store,
    morningStreak: ms,
    nightStreak: ns,
    bestMorningStreak: Math.max(store.bestMorningStreak, ms),
    bestNightStreak: Math.max(store.bestNightStreak, ns),
    lastMorningDate: morning ? today : store.lastMorningDate,
    lastNightDate: night ? today : store.lastNightDate,
  };
}

export function getSkinMeta(c: SkinCondition): { label: string; emoji: string; color: string; glow: string } {
  switch (c) {
    case 'calm':       return { label: 'Calm',        emoji: '🌿', color: '#98D4A3', glow: 'Calm Glow'     };
    case 'hydrated':   return { label: 'Hydrated',    emoji: '💧', color: '#7EC8E3', glow: 'Soft Glow'     };
    case 'breakingout':return { label: 'Breaking Out',emoji: '🔥', color: '#F4A261', glow: 'Active'        };
    case 'dry':        return { label: 'Dry',         emoji: '🌬', color: '#B0C4DE', glow: 'Needs Care'    };
    case 'glowing':    return { label: 'Glowing',     emoji: '🌸', color: '#C9AEED', glow: 'Radiant Glow'  };
    case 'sensitive':  return { label: 'Sensitive',   emoji: '⚡', color: '#FFCA6B', glow: 'Handle Gently' };
  }
}

export function getGlowLevel(log: DayLog): { label: string; opacity: number; color: string } {
  const stepsTotal = log.morningSteps.length + log.nightSteps.length;
  const stepsDone = log.morningSteps.filter(s => s.done).length + log.nightSteps.filter(s => s.done).length;
  const ratio = stepsTotal > 0 ? stepsDone / stepsTotal : 0;

  if (log.skinCondition === 'glowing' && ratio > 0.6) {
    return { label: 'Radiant Glow ✨', opacity: 1.0, color: '#C9AEED' };
  }
  if (ratio > 0.5 || log.morningDone || log.nightDone) {
    return { label: 'Soft Glow 💧', opacity: 0.75, color: '#7EC8E3' };
  }
  return { label: 'Calm Glow 🌿', opacity: 0.45, color: '#98D4A3' };
}

export function getNimbusSkincareNote(log: DayLog): string {
  if (!log.morningDone && !log.nightDone && !log.skinCondition) {
    return 'Care starts with showing up once. 🌿';
  }
  if (log.morningDone && log.nightDone) {
    return 'You took care of your skin today. That consistency matters. ✨';
  }
  if (log.morningDone) {
    return 'Morning care done. Even on tired days, small care still counts. 💧';
  }
  if (log.nightDone) {
    return 'Night routine done. Your skin is grateful for the quiet care. 🌙';
  }
  const skin = log.skinCondition ? getSkinMeta(log.skinCondition) : null;
  if (skin?.label === 'Sensitive') {
    return 'Your skin is speaking today. Extra gentleness is enough. 🌸';
  }
  return "Your skin doesn\u2019t need perfection, just care. \uD83C\uDF3F";
}
