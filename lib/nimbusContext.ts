import type { DiaryEntry, Habit, Todo, StudySession, MemorySlip, SocialPost } from './firestore';

type ContextInput = {
  diary: DiaryEntry[];
  habits: Habit[];
  todos: Todo[];
  studySessions: StudySession[];
  memorySlips: MemorySlip[];
  socialPosts: SocialPost[];
  todayMood: string | null;
};

export function buildNimbusContext(data: ContextInput): string {
  const lines: string[] = [];
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
  const todayStr = now.toISOString().split('T')[0];

  // Today's mood
  if (data.todayMood) lines.push(`Today's mood: ${data.todayMood}`);

  // Recent diary moods + latest entry
  const recentDiary = data.diary.slice(0, 7);
  if (recentDiary.length > 0) {
    const moods = [...new Set(recentDiary.map((e) => e.mood).filter(Boolean))].slice(0, 4);
    if (moods.length) lines.push(`Recent moods: ${moods.join(', ')}`);
    const latest = recentDiary[0];
    if (latest?.title) lines.push(`Latest diary: "${latest.title}"`);
  }

  // Best habit streak
  const topHabit = [...data.habits].sort((a, b) => b.streak - a.streak)[0];
  if (topHabit?.streak > 0) lines.push(`Strongest habit: ${topHabit.icon ?? ''} ${topHabit.name} (${topHabit.streak}-day streak)`);

  // Monthly study hours
  const monthMins = data.studySessions
    .filter((s) => new Date(s.date) >= thirtyAgo)
    .reduce((t, s) => t + s.durationMinutes, 0);
  if (monthMins >= 30) {
    const h = Math.floor(monthMins / 60);
    const m = monthMins % 60;
    lines.push(`Study this month: ${h}h ${m > 0 ? m + 'm' : ''}`);
  }

  // Top subject
  const subjectMap: Record<string, number> = {};
  data.studySessions
    .filter((s) => new Date(s.date) >= thirtyAgo)
    .forEach((s) => { subjectMap[s.subjectName] = (subjectMap[s.subjectName] ?? 0) + s.durationMinutes; });
  const topSubject = Object.entries(subjectMap).sort((a, b) => b[1] - a[1])[0];
  if (topSubject) lines.push(`Most studied subject: ${topSubject[0]}`);

  // Active todos (not completed today)
  const activeTodos = data.todos
    .filter((t) => !t.isArchived && !t.completedDates.includes(todayStr))
    .slice(0, 3);
  if (activeTodos.length) lines.push(`Active tasks: ${activeTodos.map((t) => t.title).join(', ')}`);

  // Recent memory slip
  if (data.memorySlips[0]) lines.push(`Recent memory: "${data.memorySlips[0].title}"`);

  // Recent social post topic
  const recentPost = data.socialPosts[0];
  if (recentPost?.tags?.length) lines.push(`Recent themes: ${recentPost.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}`);

  return lines.length ? lines.join('\n') : 'Just getting started — not much data yet.';
}

export function getRandomMemory(memorySlips: MemorySlip[]): MemorySlip | null {
  if (!memorySlips.length) return null;
  return memorySlips[Math.floor(Math.random() * memorySlips.length)];
}
