import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

export type DiaryEntry = {
  id: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
  weather?: string;
  energyLevel?: number;
  isTimeCapsule?: boolean;
  unlocksAt?: Date | null;
  isFavorite?: boolean;
  entryType?: string;
};

export type Memory = {
  id: string;
  photo: string;
  caption: string;
  date: string;
  frameColor: string;
  createdAt: Date;
};

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  completedDates: string[];
  streak: number;
  createdAt: Date;
};

export type UnsentMessage = {
  id: string;
  to: string;
  content: string;
  mood: string;
  createdAt: Date;
};

export type StudyNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type VaultEntry = {
  id: string;
  type: 'diary' | 'unsent' | 'note';
  title: string;
  content: string;
  createdAt: Date;
};

const userRef = (uid: string) => doc(db, 'users', uid);
const diaryRef = (uid: string) => collection(db, 'users', uid, 'diary');
const memoriesRef = (uid: string) => collection(db, 'users', uid, 'memories');
const habitsRef = (uid: string) => collection(db, 'users', uid, 'habits');
const unsentRef = (uid: string) => collection(db, 'users', uid, 'unsent');
const studyRef = (uid: string) => collection(db, 'users', uid, 'study');
const vaultRef = (uid: string) => collection(db, 'users', uid, 'vault');

const toDate = (ts: unknown): Date => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date();
};

const toDateOrNull = (ts: unknown): Date | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
};

// Diary
export const subscribeDiary = (
  uid: string,
  callback: (entries: DiaryEntry[]) => void
) => {
  const q = query(diaryRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const entries: DiaryEntry[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt' | 'unlocksAt'>),
      createdAt: toDate(d.data().createdAt),
      updatedAt: toDate(d.data().updatedAt),
      unlocksAt: toDateOrNull(d.data().unlocksAt),
    }));
    callback(entries);
  });
};

export const addDiaryEntry = async (
  uid: string,
  entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>
) => {
  return addDoc(diaryRef(uid), {
    ...entry,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateDiaryEntry = async (
  uid: string,
  id: string,
  data: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>
) => {
  return updateDoc(doc(diaryRef(uid), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDiaryEntry = async (uid: string, id: string) => {
  return deleteDoc(doc(diaryRef(uid), id));
};

// Memories
export const subscribeMemories = (
  uid: string,
  callback: (memories: Memory[]) => void
) => {
  const q = query(memoriesRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const memories: Memory[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Memory, 'id' | 'createdAt'>),
      createdAt: toDate(d.data().createdAt),
    }));
    callback(memories);
  });
};

export const addMemory = async (
  uid: string,
  memory: Omit<Memory, 'id' | 'createdAt'>
) => {
  return addDoc(memoriesRef(uid), { ...memory, createdAt: serverTimestamp() });
};

export const deleteMemory = async (uid: string, id: string) => {
  return deleteDoc(doc(memoriesRef(uid), id));
};

// Habits
export const subscribeHabits = (
  uid: string,
  callback: (habits: Habit[]) => void
) => {
  const q = query(habitsRef(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const habits: Habit[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Habit, 'id' | 'createdAt'>),
      createdAt: toDate(d.data().createdAt),
    }));
    callback(habits);
  });
};

export const addHabit = async (
  uid: string,
  habit: Omit<Habit, 'id' | 'createdAt'>
) => {
  return addDoc(habitsRef(uid), { ...habit, createdAt: serverTimestamp() });
};

export const updateHabit = async (
  uid: string,
  id: string,
  data: Partial<Omit<Habit, 'id' | 'createdAt'>>
) => {
  return updateDoc(doc(habitsRef(uid), id), data);
};

export const deleteHabit = async (uid: string, id: string) => {
  return deleteDoc(doc(habitsRef(uid), id));
};

// Unsent Messages (legacy)
export const subscribeUnsent = (
  uid: string,
  callback: (messages: UnsentMessage[]) => void
) => {
  const q = query(unsentRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const messages: UnsentMessage[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UnsentMessage, 'id' | 'createdAt'>),
      createdAt: toDate(d.data().createdAt),
    }));
    callback(messages);
  });
};

export const addUnsentMessage = async (
  uid: string,
  message: Omit<UnsentMessage, 'id' | 'createdAt'>
) => {
  return addDoc(unsentRef(uid), { ...message, createdAt: serverTimestamp() });
};

export const deleteUnsentMessage = async (uid: string, id: string) => {
  return deleteDoc(doc(unsentRef(uid), id));
};

// ── Unsent Conversations (messaging app) ───────────────────────────────────

export type RelationshipType =
  | 'family' | 'friend' | 'crush' | 'ex'
  | 'teacher' | 'coworker' | 'future-me' | 'myself' | 'custom';

export const RELATIONSHIP_OPTIONS: { key: RelationshipType; label: string; emoji: string }[] = [
  { key: 'family',     label: 'Family',     emoji: '👨' },
  { key: 'friend',     label: 'Friend',     emoji: '👩' },
  { key: 'crush',      label: 'Crush',      emoji: '❤️' },
  { key: 'ex',         label: 'Ex',         emoji: '💔' },
  { key: 'teacher',    label: 'Teacher',    emoji: '🎓' },
  { key: 'coworker',   label: 'Coworker',   emoji: '💼' },
  { key: 'future-me',  label: 'Future Me',  emoji: '🌎' },
  { key: 'myself',     label: 'Myself',     emoji: '🧠' },
  { key: 'custom',     label: 'Custom',     emoji: '✨' },
];

export type UnsentConversation = {
  id: string;
  recipientName: string;
  relationshipType: RelationshipType;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  theme: string;
  createdAt: Date;
};

export type UnsentChatMessage = {
  id: string;
  content: string;
  type: 'text' | 'reflection';
  reactions: string[];
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
};

const unsentConvsRef = (uid: string) =>
  collection(db, 'users', uid, 'unsentConversations');
const unsentMsgsRef = (uid: string, convId: string) =>
  collection(db, 'users', uid, 'unsentConversations', convId, 'messages');

export const subscribeUnsentConversations = (
  uid: string,
  callback: (convs: UnsentConversation[]) => void
) => {
  const q = query(unsentConvsRef(uid), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const convs: UnsentConversation[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        recipientName: data.recipientName ?? '',
        relationshipType: data.relationshipType ?? 'custom',
        lastMessage: data.lastMessage ?? '',
        lastMessageAt: toDate(data.lastMessageAt ?? data.createdAt),
        messageCount: data.messageCount ?? 0,
        theme: data.theme ?? 'blue',
        createdAt: toDate(data.createdAt),
      };
    });
    callback(convs);
  });
};

export const addUnsentConversation = async (
  uid: string,
  conv: Omit<UnsentConversation, 'id' | 'createdAt' | 'lastMessageAt' | 'lastMessage' | 'messageCount'>
) => {
  return addDoc(unsentConvsRef(uid), {
    ...conv,
    lastMessage: '',
    messageCount: 0,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  });
};

export const deleteUnsentConversation = async (uid: string, id: string) => {
  return deleteDoc(doc(unsentConvsRef(uid), id));
};

export const subscribeUnsentMessages = (
  uid: string,
  convId: string,
  callback: (msgs: UnsentChatMessage[]) => void
) => {
  const q = query(unsentMsgsRef(uid, convId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const msgs: UnsentChatMessage[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        content: data.content ?? '',
        type: data.type ?? 'text',
        reactions: data.reactions ?? [],
        isPinned: data.isPinned ?? false,
        tags: data.tags ?? [],
        createdAt: toDate(data.createdAt),
      };
    });
    callback(msgs);
  });
};

export const addUnsentChatMessage = async (
  uid: string,
  convId: string,
  message: Pick<UnsentChatMessage, 'content' | 'type' | 'tags'>
) => {
  const msgRef = await addDoc(unsentMsgsRef(uid, convId), {
    ...message,
    reactions: [],
    isPinned: false,
    createdAt: serverTimestamp(),
  });
  try {
    const snap = await getDocs(unsentMsgsRef(uid, convId));
    await updateDoc(doc(unsentConvsRef(uid), convId), {
      lastMessage: message.content,
      lastMessageAt: serverTimestamp(),
      messageCount: snap.size,
    });
  } catch {}
  return msgRef;
};

export const deleteUnsentChatMessage = async (uid: string, convId: string, msgId: string) => {
  return deleteDoc(doc(unsentMsgsRef(uid, convId), msgId));
};

export const toggleUnsentMessagePin = async (
  uid: string, convId: string, msgId: string, isPinned: boolean
) => {
  return updateDoc(doc(unsentMsgsRef(uid, convId), msgId), { isPinned });
};

export const addUnsentMessageReaction = async (
  uid: string, convId: string, msgId: string, reactions: string[]
) => {
  return updateDoc(doc(unsentMsgsRef(uid, convId), msgId), { reactions });
};

// Study Notes
export const subscribeStudyNotes = (
  uid: string,
  callback: (notes: StudyNote[]) => void
) => {
  const q = query(studyRef(uid), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const notes: StudyNote[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>),
      createdAt: toDate(d.data().createdAt),
      updatedAt: toDate(d.data().updatedAt),
    }));
    callback(notes);
  });
};

export const addStudyNote = async (
  uid: string,
  note: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>
) => {
  return addDoc(studyRef(uid), {
    ...note,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateStudyNote = async (
  uid: string,
  id: string,
  data: Partial<Omit<StudyNote, 'id' | 'createdAt'>>
) => {
  return updateDoc(doc(studyRef(uid), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteStudyNote = async (uid: string, id: string) => {
  return deleteDoc(doc(studyRef(uid), id));
};

// Vault
export const subscribeVault = (
  uid: string,
  callback: (entries: VaultEntry[]) => void
) => {
  const q = query(vaultRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const entries: VaultEntry[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<VaultEntry, 'id' | 'createdAt'>),
      createdAt: toDate(d.data().createdAt),
    }));
    callback(entries);
  });
};

export const addVaultEntry = async (
  uid: string,
  entry: Omit<VaultEntry, 'id' | 'createdAt'>
) => {
  return addDoc(vaultRef(uid), { ...entry, createdAt: serverTimestamp() });
};

export const deleteVaultEntry = async (uid: string, id: string) => {
  return deleteDoc(doc(vaultRef(uid), id));
};

// ── To Do/n't ──────────────────────────────────────────────────────────────

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TodoRepeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type TodoType = 'todo' | 'todont';

export type Todo = {
  id: string;
  title: string;
  type: TodoType;
  category: string;
  priority: TodoPriority;
  description: string;
  repeat: TodoRepeat;
  requiresProof: boolean;
  proofImageUri: string;
  completedDates: string[];
  streak: number;
  reflection: string;
  isArchived: boolean;
  isFocused: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const todosRef = (uid: string) => collection(db, 'users', uid, 'todos');

export const subscribeTodos = (
  uid: string,
  callback: (todos: Todo[]) => void
) => {
  const q = query(todosRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const todos: Todo[] = snap.docs.map((d) => ({
      id: d.id,
      title: d.data().title ?? '',
      type: d.data().type ?? 'todo',
      category: d.data().category ?? 'Personal',
      priority: d.data().priority ?? 'medium',
      description: d.data().description ?? '',
      repeat: d.data().repeat ?? 'none',
      requiresProof: d.data().requiresProof ?? false,
      proofImageUri: d.data().proofImageUri ?? '',
      completedDates: d.data().completedDates ?? [],
      streak: d.data().streak ?? 0,
      reflection: d.data().reflection ?? '',
      isArchived: d.data().isArchived ?? false,
      isFocused: d.data().isFocused ?? false,
      createdAt: toDate(d.data().createdAt),
      updatedAt: toDate(d.data().updatedAt),
    }));
    callback(todos);
  });
};

export const addTodo = async (
  uid: string,
  todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>
) => {
  return addDoc(todosRef(uid), {
    ...todo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateTodo = async (
  uid: string,
  id: string,
  data: Partial<Omit<Todo, 'id' | 'createdAt'>>
) => {
  return updateDoc(doc(todosRef(uid), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTodo = async (uid: string, id: string) => {
  return deleteDoc(doc(todosRef(uid), id));
};

// ── Social Posts (Unsocial Me-dia) ─────────────────────────────────────────

export type SocialPostReflection = {
  text: string;
  createdAt: Date;
};

export type SocialPost = {
  id: string;
  content: string;
  mood: string;
  images: string[];
  tags: string[];
  postType: string;
  isLiked: boolean;
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isDraft: boolean;
  location: string;
  reflections: SocialPostReflection[];
  createdAt: Date;
  updatedAt: Date;
};

const socialRef = (uid: string) => collection(db, 'users', uid, 'social');

export const subscribeSocialPosts = (
  uid: string,
  callback: (posts: SocialPost[]) => void
) => {
  const q = query(socialRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const posts: SocialPost[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        content: data.content ?? '',
        mood: data.mood ?? '',
        images: data.images ?? [],
        tags: data.tags ?? [],
        postType: data.postType ?? 'text',
        isLiked: data.isLiked ?? false,
        isFavorite: data.isFavorite ?? false,
        isPinned: data.isPinned ?? false,
        isArchived: data.isArchived ?? false,
        isDraft: data.isDraft ?? false,
        location: data.location ?? '',
        reflections: (data.reflections ?? []).map((r: any) => ({
          text: r.text ?? '',
          createdAt: toDate(r.createdAt),
        })),
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    });
    callback(posts);
  });
};

export const addSocialPost = async (
  uid: string,
  post: Omit<SocialPost, 'id' | 'createdAt' | 'updatedAt'>
) => {
  return addDoc(socialRef(uid), {
    ...post,
    reflections: post.reflections.map((r) => ({
      text: r.text,
      createdAt: serverTimestamp(),
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateSocialPost = async (
  uid: string,
  id: string,
  data: Partial<Omit<SocialPost, 'id' | 'createdAt'>>
) => {
  return updateDoc(doc(socialRef(uid), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteSocialPost = async (uid: string, id: string) => {
  return deleteDoc(doc(socialRef(uid), id));
};

// ── Study Sanctuary ──────────────────────────────────────────────────────────

export type Subject = {
  id: string;
  name: string;
  color: string;
  icon: string;
  teacher?: string;
  notes?: string;
  totalMinutes: number;
  createdAt: Date;
};

const subjectsRef = (uid: string) => collection(db, 'users', uid, 'subjects');

export const subscribeSubjects = (uid: string, cb: (s: Subject[]) => void) =>
  onSnapshot(query(subjectsRef(uid), orderBy('createdAt', 'asc')), (snap) =>
    cb(snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? '',
      color: d.data().color ?? '#5BB8D4',
      icon: d.data().icon ?? '📚',
      teacher: d.data().teacher,
      notes: d.data().notes,
      totalMinutes: d.data().totalMinutes ?? 0,
      createdAt: toDate(d.data().createdAt),
    })))
  );

export const addSubject = (uid: string, s: Omit<Subject, 'id' | 'createdAt'>) =>
  addDoc(subjectsRef(uid), { ...s, createdAt: serverTimestamp() });

export const updateSubject = (uid: string, id: string, data: Partial<Subject>) =>
  updateDoc(doc(subjectsRef(uid), id), data);

export const deleteSubject = (uid: string, id: string) =>
  deleteDoc(doc(subjectsRef(uid), id));

export type SessionType = 'reading' | 'homework' | 'revision' | 'practice' | 'essay' | 'other';
export type CompletionStatus = 'yes' | 'partial' | 'no';

export type StudySession = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  durationMinutes: number;
  goalText: string;
  sessionType: SessionType;
  completionStatus: CompletionStatus;
  reflection: string;
  mood: string;
  date: string;
  createdAt: Date;
};

const sessionsRef = (uid: string) => collection(db, 'users', uid, 'studySessions');

export const subscribeStudySessions = (uid: string, cb: (s: StudySession[]) => void) =>
  onSnapshot(query(sessionsRef(uid), orderBy('createdAt', 'desc'), limit(200)), (snap) =>
    cb(snap.docs.map((d) => ({
      id: d.id,
      subjectId: d.data().subjectId ?? '',
      subjectName: d.data().subjectName ?? '',
      subjectColor: d.data().subjectColor ?? '#5BB8D4',
      durationMinutes: d.data().durationMinutes ?? 0,
      goalText: d.data().goalText ?? '',
      sessionType: d.data().sessionType ?? 'other',
      completionStatus: d.data().completionStatus ?? 'yes',
      reflection: d.data().reflection ?? '',
      mood: d.data().mood ?? '',
      date: d.data().date ?? '',
      createdAt: toDate(d.data().createdAt),
    })))
  );

export const addStudySession = (uid: string, s: Omit<StudySession, 'id' | 'createdAt'>) =>
  addDoc(sessionsRef(uid), { ...s, createdAt: serverTimestamp() });

export type DeadlineType = 'exam' | 'assignment' | 'project' | 'essay' | 'presentation';
export type DeadlinePriority = 'low' | 'medium' | 'high';

export type StudyDeadline = {
  id: string;
  title: string;
  type: DeadlineType;
  subjectId: string;
  subjectName: string;
  dueDate: Date;
  priority: DeadlinePriority;
  status: 'pending' | 'done';
  createdAt: Date;
};

const deadlinesRef = (uid: string) => collection(db, 'users', uid, 'studyDeadlines');

export const subscribeStudyDeadlines = (uid: string, cb: (d: StudyDeadline[]) => void) =>
  onSnapshot(query(deadlinesRef(uid), orderBy('dueDate', 'asc')), (snap) =>
    cb(snap.docs.map((d) => ({
      id: d.id,
      title: d.data().title ?? '',
      type: d.data().type ?? 'assignment',
      subjectId: d.data().subjectId ?? '',
      subjectName: d.data().subjectName ?? '',
      dueDate: toDate(d.data().dueDate),
      priority: d.data().priority ?? 'medium',
      status: d.data().status ?? 'pending',
      createdAt: toDate(d.data().createdAt),
    })))
  );

export const addStudyDeadline = (uid: string, d: Omit<StudyDeadline, 'id' | 'createdAt'>) =>
  addDoc(deadlinesRef(uid), { ...d, createdAt: serverTimestamp() });

export const updateStudyDeadline = (uid: string, id: string, data: Partial<StudyDeadline>) =>
  updateDoc(doc(deadlinesRef(uid), id), data);

export const deleteStudyDeadline = (uid: string, id: string) =>
  deleteDoc(doc(deadlinesRef(uid), id));
