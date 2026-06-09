import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import {
  subscribeDiary,
  subscribeMemories,
  subscribeHabits,
  subscribeUnsent,
  subscribeStudyNotes,
  subscribeSocialPosts,
  subscribeTodos,
  subscribeSubjects,
  subscribeStudySessions,
  subscribeStudyDeadlines,
} from '@/lib/firestore';

export function useDataSync() {
  const user = useAuthStore((s) => s.user);
  const {
    setDiary, setMemories, setHabits, setUnsent, setStudyNotes,
    setSocialPosts, setTodos, setSubjects, setStudySessions, setStudyDeadlines,
  } = useAppStore();

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const unsubs = [
      subscribeDiary(uid, setDiary),
      subscribeMemories(uid, setMemories),
      subscribeHabits(uid, setHabits),
      subscribeUnsent(uid, setUnsent),
      subscribeStudyNotes(uid, setStudyNotes),
      subscribeSocialPosts(uid, setSocialPosts),
      subscribeTodos(uid, setTodos),
      subscribeSubjects(uid, setSubjects),
      subscribeStudySessions(uid, setStudySessions),
      subscribeStudyDeadlines(uid, setStudyDeadlines),
    ];

    return () => unsubs.forEach((u) => u());
  }, [user?.uid]);
}
