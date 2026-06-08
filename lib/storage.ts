import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

export const uploadPhoto = async (uid: string, localUri: string): Promise<string> => {
  const id = Crypto.randomUUID();
  const fileRef = ref(storage, `users/${uid}/photos/${id}.jpg`);

  const response = await fetch(localUri);
  const blob = await response.blob();

  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(fileRef);
};

export const deletePhoto = async (url: string) => {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch {
    // ignore if already deleted
  }
};
