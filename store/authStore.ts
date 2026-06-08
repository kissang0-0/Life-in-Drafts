import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
      await signInWithEmailAndPassword(auth, email, password);
      set({ loading: false });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      console.error('[Auth] signIn error:', code, msg);
      set({ loading: false, error: formatAuthError(code || msg) });
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      set({ loading: false });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      console.error('[Auth] signUp error:', code, msg);
      set({ loading: false, error: formatAuthError(code || msg) });
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ user: null });
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
  if (codeOrMsg.includes('auth/operation-not-allowed')) return 'Email/password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.';
  if (codeOrMsg.includes('auth/configuration-not-found') || codeOrMsg.includes('configuration-not-found')) return 'Firebase not configured. Enable Email/Password in Firebase Console.';
  return `Auth error: ${codeOrMsg}`;
}
