import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const KEYS = {
  PIN_HASH: 'lid_pin_hash',
  PIN_LENGTH: 'lid_pin_length',
  VAULT_PIN_HASH: 'lid_vault_pin_hash',
  OWNER_EMAIL: 'lid_owner_email',
  BIOMETRIC_ENABLED: 'lid_biometric_enabled',
  LOCK_TIMEOUT: 'lid_lock_timeout',
};

const secureGet = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

const secureSet = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  } catch {}
};

const secureDelete = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  } catch {}
};

const hashPIN = async (raw: string): Promise<string> => {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    'life_in_drafts_v1::' + raw
  );
};

export const savePIN = async (pin: string): Promise<void> => {
  const hash = await hashPIN(pin);
  await secureSet(KEYS.PIN_HASH, hash);
  await secureSet(KEYS.PIN_LENGTH, String(pin.length));
};

export const verifyPIN = async (pin: string): Promise<boolean> => {
  const stored = await secureGet(KEYS.PIN_HASH);
  if (!stored) return false;
  const hash = await hashPIN(pin);
  return hash === stored;
};

export const hasPINSet = async (): Promise<boolean> => {
  const h = await secureGet(KEYS.PIN_HASH);
  return !!h;
};

export const getPINLength = async (): Promise<number> => {
  const len = await secureGet(KEYS.PIN_LENGTH);
  return len ? parseInt(len, 10) : 4;
};

export const clearPIN = async (): Promise<void> => {
  await secureDelete(KEYS.PIN_HASH);
  await secureDelete(KEYS.PIN_LENGTH);
};

export const saveVaultPIN = async (pin: string): Promise<void> => {
  const hash = await hashPIN(pin + '::vault');
  await secureSet(KEYS.VAULT_PIN_HASH, hash);
};

export const verifyVaultPIN = async (pin: string): Promise<boolean> => {
  const stored = await secureGet(KEYS.VAULT_PIN_HASH);
  if (!stored) return false;
  const hash = await hashPIN(pin + '::vault');
  return hash === stored;
};

export const hasVaultPINSet = async (): Promise<boolean> => {
  const h = await secureGet(KEYS.VAULT_PIN_HASH);
  return !!h;
};

export const clearVaultPIN = async (): Promise<void> => {
  await secureDelete(KEYS.VAULT_PIN_HASH);
};

export const saveOwnerEmail = async (email: string): Promise<void> => {
  const existing = await secureGet(KEYS.OWNER_EMAIL);
  if (!existing) await secureSet(KEYS.OWNER_EMAIL, email.toLowerCase().trim());
};

export const getOwnerEmail = async (): Promise<string | null> => {
  return secureGet(KEYS.OWNER_EMAIL);
};

export const isOwnerEmail = async (email: string): Promise<boolean> => {
  const owner = await secureGet(KEYS.OWNER_EMAIL);
  if (!owner) return true;
  return owner === email.toLowerCase().trim();
};

export const saveBiometricEnabled = async (enabled: boolean): Promise<void> => {
  await secureSet(KEYS.BIOMETRIC_ENABLED, enabled ? '1' : '0');
};

export const getBiometricEnabled = async (): Promise<boolean> => {
  const val = await secureGet(KEYS.BIOMETRIC_ENABLED);
  return val === '1';
};

export const saveLockTimeout = async (minutes: number): Promise<void> => {
  await secureSet(KEYS.LOCK_TIMEOUT, String(minutes));
};

export const getLockTimeout = async (): Promise<number> => {
  const val = await secureGet(KEYS.LOCK_TIMEOUT);
  return val !== null ? parseInt(val, 10) : 0;
};
