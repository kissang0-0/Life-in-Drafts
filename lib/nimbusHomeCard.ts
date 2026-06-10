import { Platform } from 'react-native';
import type {
  DiaryEntry, Habit, MemorySlip, SocialPost,
  Todo, StudySession, Star, Memory,
} from './firestore';

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lid_nimbus_homecard_v2';
const CARD_TTL_MS = 12 * 60 * 60 * 1000; // regenerate after 12 h
const MAX_HISTORY = 12;

export type NimbusCardData = {
  message: string;
  category: string;
  generatedAt: number;
  history: string[];
};

async function loadCard(): Promise<NimbusCardData | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = localStorage.getItem(STORAGE_KEY);
    } else {
      const SS = await import('expo-secure-store');
      raw = await SS.getItemAsync(STORAGE_KEY);
    }
    return raw ? (JSON.parse(raw) as NimbusCardData) : null;
  } catch { return null; }
}

async function saveCard(card: NimbusCardData): Promise<void> {
  try {
    const raw = JSON.stringify(card);
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, raw);
    } else {
      const SS = await import('expo-secure-store');
      await SS.setItemAsync(STORAGE_KEY, raw);
    }
  } catch {}
}

// ─── Staleness check ─────────────────────────────────────────────────────────

function needsRefresh(card: NimbusCardData): boolean {
  const age = Date.now() - card.generatedAt;
  if (age > CARD_TTL_MS) return true;
  // also refresh on a new calendar day
  const cardDay = new Date(card.generatedAt).toDateString();
  const today = new Date().toDateString();
  return cardDay !== today;
}

// ─── Category picker (weighted) ──────────────────────────────────────────────

const CATEGORIES: { name: string; weight: number }[] = [
  { name: 'Observation',            weight: 15 },
  { name: 'Reflection',             weight: 12 },
  { name: 'Encouragement',          weight: 10 },
  { name: 'Pattern Recognition',    weight: 12 },
  { name: 'Memory Recall',          weight:  6 },
  { name: 'Gentle Question',        weight: 10 },
  { name: 'Growth Recognition',     weight: 12 },
  { name: 'Life Chapter Reflection', weight: 8 },
  { name: 'Seasonal Reflection',    weight:  7 },
  { name: 'Emotional Check-In',     weight:  8 },
];

function pickCategory(): string {
  const total = CATEGORIES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const cat of CATEGORIES) {
    r -= cat.weight;
    if (r <= 0) return cat.name;
  }
  return CATEGORIES[0].name;
}

// ─── Context builder ─────────────────────────────────────────────────────────

type ContextInput = {
  diary: DiaryEntry[];
  habits: Habit[];
  memories: Memory[];
  memorySlips: MemorySlip[];
  socialPosts: SocialPost[];
  todos: Todo[];
  studySessions: StudySession[];
  stars: Star[];
  todayMood: string | null;
};

export function buildCardContext(data: ContextInput): string {
  const lines: string[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenAgo  = new Date(now.getTime() -  7 * 86400000);
  const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
  const ninetyAgo = new Date(now.getTime() - 90 * 86400000);

  // Date + season context
  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  lines.push(`Today: ${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);

  // Mood
  if (data.todayMood) lines.push(`Today's mood: ${data.todayMood}`);
  const moodHistory = data.diary.slice(0, 10).map(e => e.mood).filter(Boolean);
  if (moodHistory.length > 1) lines.push(`Recent mood pattern (newest first): ${moodHistory.slice(0, 7).join(', ')}`);

  // Diary
  const recentDiary = data.diary.slice(0, 7);
  if (recentDiary.length > 0) {
    lines.push(`Recent diary entries: ${recentDiary.map(e => `"${e.title}"`).join(', ')}`);
  }
  const weekEntries = data.diary.filter(e => e.createdAt >= sevenAgo).length;
  lines.push(`Entries this week: ${weekEntries}`);
  lines.push(`Total diary entries: ${data.diary.length}`);

  // Specific content of most recent entry (for context richness)
  const latestEntry = data.diary[0];
  if (latestEntry?.content) {
    const snippet = latestEntry.content.replace(/\n/g, ' ').slice(0, 200);
    lines.push(`Latest entry excerpt: "${snippet}"`);
  }

  // Habits
  if (data.habits.length > 0) {
    const sorted = [...data.habits].sort((a, b) => b.streak - a.streak);
    const top3 = sorted.slice(0, 3).map(h => `${h.name} (${h.streak}-day streak)`).join(', ');
    lines.push(`Top habits: ${top3}`);
    const doneToday = data.habits.filter(h => h.completedDates.includes(todayStr));
    if (doneToday.length) lines.push(`Completed today: ${doneToday.map(h => h.name).join(', ')}`);
    const totalHabits = data.habits.length;
    lines.push(`Total habits tracked: ${totalHabits}`);
  }

  // What Stayed (photo memories)
  if (data.memories.length > 0) {
    lines.push(`Photo memories saved: ${data.memories.length}`);
    if (data.memories[0]?.caption) lines.push(`Most recent photo caption: "${data.memories[0].caption}"`);
  }

  // Memory Jar (slips)
  if (data.memorySlips.length > 0) {
    lines.push(`Memory jar entries: ${data.memorySlips.length}`);
    data.memorySlips.slice(0, 3).forEach(m => lines.push(`Memory slip: "${m.title}"`));
  }

  // Stars / Constellation
  if (data.stars.length > 0) lines.push(`Constellation stars: ${data.stars.length}`);

  // Study
  const monthSessions = data.studySessions.filter(s => new Date(s.date) >= thirtyAgo);
  if (monthSessions.length > 0) {
    const mins = monthSessions.reduce((t, s) => t + s.durationMinutes, 0);
    lines.push(`Study this month: ${Math.floor(mins / 60)}h ${mins % 60}m across ${monthSessions.length} sessions`);
  }

  // To-Dos
  const activeTodos = data.todos.filter(t => !t.isArchived && !t.completedDates.includes(todayStr));
  if (activeTodos.length) lines.push(`Active tasks: ${activeTodos.slice(0, 3).map(t => t.title).join(', ')}`);

  // Unsocial ME-dia themes
  if (data.socialPosts[0]?.tags?.length) {
    lines.push(`Recent self-expression themes: ${data.socialPosts[0].tags.slice(0, 4).join(', ')}`);
  }

  // Old entry for potential memory recall
  const oldEntry = data.diary.find(e => e.createdAt < ninetyAgo);
  if (oldEntry) lines.push(`Old diary entry (90+ days ago): "${oldEntry.title}"`);

  return lines.join('\n');
}

// ─── API call ────────────────────────────────────────────────────────────────

async function fetchFromApi(context: string, history: string[], category: string): Promise<string> {
  const res = await fetch('/api/nimbus-homecard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, history, category }),
  });
  const json = await res.json();
  if (!res.ok || !json.message) throw new Error(json.error ?? 'Could not generate card');
  return json.message as string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getOrRefreshNimbusCard(
  data: ContextInput,
  force = false
): Promise<{ message: string; category: string; fromCache: boolean }> {
  const cached = await loadCard();

  if (!force && cached && !needsRefresh(cached)) {
    return { message: cached.message, category: cached.category, fromCache: true };
  }

  const history = cached?.history ?? [];
  const category = pickCategory();
  const context  = buildCardContext(data);

  const message = await fetchFromApi(context, history.slice(-MAX_HISTORY), category);

  await saveCard({
    message,
    category,
    generatedAt: Date.now(),
    history: [...history, message].slice(-MAX_HISTORY),
  });

  return { message, category, fromCache: false };
}
