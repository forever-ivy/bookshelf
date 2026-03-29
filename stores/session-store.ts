import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { OnboardingState, SessionIdentity, StudentProfile } from '@/lib/api/types';

const TOKEN_STORAGE_KEY = 'library.reader.access-token';

export type AppBootstrapStatus = 'idle' | 'loading' | 'ready';

export type AppSessionSnapshot = {
  bootstrapStatus: AppBootstrapStatus;
  identity: SessionIdentity | null;
  onboarding: OnboardingState | null;
  profile: StudentProfile | null;
  token: string | null;
};

type AppSessionStore = AppSessionSnapshot & {
  clearSession: () => Promise<void>;
  hydrateStoredToken: (token: string) => void;
  setBootstrapStatus: (status: AppBootstrapStatus) => void;
  setSession: (payload: {
    identity: SessionIdentity;
    onboarding: OnboardingState;
    profile: StudentProfile | null;
    token: string;
  }) => Promise<void>;
};

async function persistToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}

export async function readStoredSessionToken() {
  return SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
}

export const useSessionStore = create<AppSessionStore>((set) => ({
  bootstrapStatus: 'idle',
  identity: null,
  onboarding: null,
  profile: null,
  token: null,
  clearSession: async () => {
    await persistToken(null);
    set({
      bootstrapStatus: 'ready',
      identity: null,
      onboarding: null,
      profile: null,
      token: null,
    });
  },
  hydrateStoredToken: (token) => {
    set({
      bootstrapStatus: 'ready',
      identity: null,
      onboarding: null,
      profile: null,
      token,
    });
  },
  setBootstrapStatus: (status) => {
    set({ bootstrapStatus: status });
  },
  setSession: async ({ identity, onboarding, profile, token }) => {
    await persistToken(token);
    set({
      bootstrapStatus: 'ready',
      identity,
      onboarding,
      profile,
      token,
    });
  },
}));
