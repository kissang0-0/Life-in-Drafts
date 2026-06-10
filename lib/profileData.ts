import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'lid_profile_v1';

export type ProfileData = {
  name: string;
  nickname: string;
  motto: string;
  currentChapter: string;
  letterToSelf: string;
  favoriteColor: string;
  favoriteSong: string;
  favoriteBook: string;
  favoriteMovie: string;
  dreamCareer: string;
  funFact: string;
  goals: string[];
  bucketList: { text: string; done: boolean }[];
  joinDate: string;
};

export const DEFAULT_PROFILE: ProfileData = {
  name: '',
  nickname: '',
  motto: '',
  currentChapter: '',
  letterToSelf: '',
  favoriteColor: '',
  favoriteSong: '',
  favoriteBook: '',
  favoriteMovie: '',
  dreamCareer: '',
  funFact: '',
  goals: [],
  bucketList: [],
  joinDate: new Date().toISOString(),
};

const get = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(KEY);
    return await SecureStore.getItemAsync(KEY);
  } catch { return null; }
};

const set = async (value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') { localStorage.setItem(KEY, value); return; }
    await SecureStore.setItemAsync(KEY, value);
  } catch {}
};

export const loadProfile = async (): Promise<ProfileData> => {
  const raw = await get();
  if (!raw) return { ...DEFAULT_PROFILE };
  try { return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULT_PROFILE }; }
};

export const saveProfile = async (data: ProfileData): Promise<void> => {
  await set(JSON.stringify(data));
};
