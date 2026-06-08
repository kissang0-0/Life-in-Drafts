import { create } from 'zustand';
import { hasPINSet, getBiometricEnabled, getPINLength, getLockTimeout } from '@/lib/security';

type SecurityState = {
  isLocked: boolean;
  isBlurred: boolean;
  hasPIN: boolean;
  pinLength: number;
  biometricEnabled: boolean;
  lockTimeoutMinutes: number;
  lastActiveAt: number | null;
  initialized: boolean;

  lock: () => void;
  unlock: () => void;
  setBlurred: (v: boolean) => void;
  setHasPIN: (v: boolean) => void;
  setPINLength: (v: number) => void;
  setBiometricEnabled: (v: boolean) => void;
  setLockTimeout: (minutes: number) => void;
  updateLastActive: () => void;
  initialize: () => Promise<void>;
};

export const useSecurityStore = create<SecurityState>((set) => ({
  isLocked: false,
  isBlurred: false,
  hasPIN: false,
  pinLength: 4,
  biometricEnabled: false,
  lockTimeoutMinutes: 0,
  lastActiveAt: null,
  initialized: false,

  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false, lastActiveAt: Date.now() }),
  setBlurred: (isBlurred) => set({ isBlurred }),
  setHasPIN: (hasPIN) => set({ hasPIN }),
  setPINLength: (pinLength) => set({ pinLength }),
  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
  setLockTimeout: (lockTimeoutMinutes) => set({ lockTimeoutMinutes }),
  updateLastActive: () => set({ lastActiveAt: Date.now() }),

  initialize: async () => {
    const [pinSet, bioEnabled, pinLen, timeout] = await Promise.all([
      hasPINSet(),
      getBiometricEnabled(),
      getPINLength(),
      getLockTimeout(),
    ]);
    set({
      hasPIN: pinSet,
      biometricEnabled: bioEnabled,
      pinLength: pinLen,
      lockTimeoutMinutes: timeout,
      isLocked: pinSet,
      initialized: true,
    });
  },

}));
