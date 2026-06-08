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
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      set({ loading: false, error: formatAuthError(msg) });
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      set({ loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      set({ loading: false, error: formatAuthError(msg) });
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));

function formatAuthError(msg: string): string {
  if (msg.includes('invalid-email')) return 'Invalid email address.';
  if (msg.includes('user-not-found')) return 'No account found with this email.';
  if (msg.includes('wrong-password') || msg.includes('invalid-credential')) return 'Incorrect password.';
  if (msg.includes('email-already-in-use')) return 'An account already exists with this email.';
  if (msg.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (msg.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  return 'Something went wrong. Please try again.';
}
