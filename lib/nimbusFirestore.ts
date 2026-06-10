import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type NimbusChatMsg = {
  id: string;
  role: 'user' | 'nimbus';
  content: string;
  mode: string | null;
  isFavorite: boolean;
  createdAt: Date;
};

const chatRef = (uid: string) => collection(db, 'users', uid, 'nimbusChats');

const toDate = (ts: unknown): Date => {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date();
};

export const subscribeNimbusChats = (
  uid: string,
  callback: (msgs: NimbusChatMsg[]) => void,
  msgLimit = 80,
) => {
  const q = query(chatRef(uid), orderBy('createdAt', 'asc'), limit(msgLimit));
  return onSnapshot(q, (snap) =>
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        role: d.data().role ?? 'user',
        content: d.data().content ?? '',
        mode: d.data().mode ?? null,
        isFavorite: d.data().isFavorite ?? false,
        createdAt: toDate(d.data().createdAt),
      }))
    )
  );
};

export const addNimbusChatMsg = (
  uid: string,
  msg: Omit<NimbusChatMsg, 'id' | 'createdAt'>
) =>
  addDoc(chatRef(uid), { ...msg, createdAt: serverTimestamp() });

export const toggleFavoriteMsg = (uid: string, msgId: string, isFavorite: boolean) =>
  updateDoc(doc(chatRef(uid), msgId), { isFavorite });

export const getLastCheckinDate = async (uid: string): Promise<string | null> => {
  try {
    const q = query(chatRef(uid), orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    const checkin = snap.docs.find((d) => d.data().mode === 'checkin');
    if (!checkin) return null;
    const date = toDate(checkin.data().createdAt);
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};
