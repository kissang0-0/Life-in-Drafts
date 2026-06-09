import { create } from 'zustand';
import {
  DiaryEntry, Memory, Habit, UnsentMessage, UnsentConversation,
  StudyNote, SocialPost, Todo, Subject, StudySession, StudyDeadline,
} from '@/lib/firestore';

type AppState = {
  diary: DiaryEntry[];
  memories: Memory[];
  habits: Habit[];
  unsent: UnsentMessage[];
  unsentConversations: UnsentConversation[];
  studyNotes: StudyNote[];
  socialPosts: SocialPost[];
  todos: Todo[];
  subjects: Subject[];
  studySessions: StudySession[];
  studyDeadlines: StudyDeadline[];
  todayMood: string | null;
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  setDiary: (entries: DiaryEntry[]) => void;
  setMemories: (memories: Memory[]) => void;
  setHabits: (habits: Habit[]) => void;
  setUnsent: (messages: UnsentMessage[]) => void;
  setUnsentConversations: (convs: UnsentConversation[]) => void;
  setStudyNotes: (notes: StudyNote[]) => void;
  setSocialPosts: (posts: SocialPost[]) => void;
  setTodos: (todos: Todo[]) => void;
  setSubjects: (subjects: Subject[]) => void;
  setStudySessions: (sessions: StudySession[]) => void;
  setStudyDeadlines: (deadlines: StudyDeadline[]) => void;
  setTodayMood: (mood: string) => void;
  setBiometricEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  reset: () => void;
};

const initialState = {
  diary: [] as DiaryEntry[],
  memories: [] as Memory[],
  habits: [] as Habit[],
  unsent: [] as UnsentMessage[],
  unsentConversations: [] as UnsentConversation[],
  studyNotes: [] as StudyNote[],
  socialPosts: [] as SocialPost[],
  todos: [] as Todo[],
  subjects: [] as Subject[],
  studySessions: [] as StudySession[],
  studyDeadlines: [] as StudyDeadline[],
  todayMood: null as string | null,
  biometricEnabled: false,
  notificationsEnabled: false,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setDiary: (diary) => set({ diary }),
  setMemories: (memories) => set({ memories }),
  setHabits: (habits) => set({ habits }),
  setUnsent: (unsent) => set({ unsent }),
  setUnsentConversations: (unsentConversations) => set({ unsentConversations }),
  setStudyNotes: (studyNotes) => set({ studyNotes }),
  setSocialPosts: (socialPosts) => set({ socialPosts }),
  setTodos: (todos) => set({ todos }),
  setSubjects: (subjects) => set({ subjects }),
  setStudySessions: (studySessions) => set({ studySessions }),
  setStudyDeadlines: (studyDeadlines) => set({ studyDeadlines }),
  setTodayMood: (todayMood) => set({ todayMood }),
  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  reset: () => set(initialState),
}));
