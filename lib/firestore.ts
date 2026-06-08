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

// Unsent Messages
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
