import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveOwnerEmail, isOwnerEmail } from '@/lib/security';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  initialize: () => () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, initialized: true, loading: false });
    });
    return unsub;
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const ownerOk = await isOwnerEmail(email);
      if (!ownerOk) {
        await firebaseSignOut(auth).catch(() => {});
        set({ loading: false, error: 'Access denied. This archive belongs to its owner only.' });
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
      await saveOwnerEmail(email);
      set({ loading: false });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (code !== 'auth/invalid-credential') console.warn('[Auth] signIn error:', code, msg);
      set({ loading: false, error: formatAuthError(code || msg) });
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const ownerOk = await isOwnerEmail(email);
      if (!ownerOk) {
        set({ loading: false, error: 'This archive is already claimed by its owner.' });
        return;
      }
      await createUserWithEmailAndPassword(auth, email, password);
      await saveOwnerEmail(email);
      set({ loading: false });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      console.warn('[Auth] signUp error:', code, msg);
      set({ loading: false, error: formatAuthError(code || msg) });
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ user: null });
  },

  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      return { success: false, error: formatAuthError(code) };
    }
  },

  clearError: () => set({ error: null }),
}));

function formatAuthError(codeOrMsg: string): string {
  if (codeOrMsg.includes('auth/invalid-email') || codeOrMsg.includes('invalid-email')) return 'Invalid email address.';
  if (codeOrMsg.includes('auth/user-not-found') || codeOrMsg.includes('user-not-found')) return 'No account found with this email.';
  if (codeOrMsg.includes('auth/wrong-password') || codeOrMsg.includes('wrong-password')) return 'Incorrect password.';
  if (codeOrMsg.includes('auth/invalid-credential') || codeOrMsg.includes('invalid-credential')) return 'Incorrect email or password.';
  if (codeOrMsg.includes('auth/email-already-in-use') || codeOrMsg.includes('email-already-in-use')) return 'An account already exists with this email.';
  if (codeOrMsg.includes('auth/weak-password') || codeOrMsg.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (codeOrMsg.includes('auth/too-many-requests') || codeOrMsg.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  if (codeOrMsg.includes('auth/network-request-failed') || codeOrMsg.includes('network')) return 'Network error. Check your connection.';
  if (codeOrMsg.includes('auth/operation-not-allowed')) return 'Email/password sign-in is not enabled.';
  if (codeOrMsg.includes('auth/configuration-not-found') || codeOrMsg.includes('configuration-not-found')) return 'Firebase not configured correctly.';
  return `Auth error: ${codeOrMsg}`;
}
