import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { OnboardingState, SessionIdentity, StudentProfile } from '@/lib/api/types';

const TOKEN_STORAGE_KEY = 'library.reader.access-token';
const REFRESH_TOKEN_STORAGE_KEY = 'library.reader.refresh-token';

export type AppBootstrapStatus = 'idle' | 'loading' | 'ready';

export type AppSessionSnapshot = {
  bootstrapStatus: AppBootstrapStatus;
  identity: SessionIdentity | null;
  onboarding: OnboardingState | null;
  profile: StudentProfile | null;
  refreshToken: string | null;
  token: string | null;
};

type AppSessionStore = AppSessionSnapshot & {
  clearSession: () => Promise<void>;
  hydrateStoredToken: (token: string) => void;
  replaceStoredSessionTokens: (payload: { accessToken: string; refreshToken: string | null }) => Promise<void>;
  setBootstrapStatus: (status: AppBootstrapStatus) => void;
  setSession: (payload: {
    identity: SessionIdentity;
    onboarding: OnboardingState;
    profile: StudentProfile | null;
    refreshToken?: string | null;
    token: string;
  }) => Promise<void>;
};

async function persistSessionTokens(payload: { accessToken: string | null; refreshToken: string | null }) {
  if (payload.accessToken) {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, payload.accessToken);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  }

  if (payload.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, payload.refreshToken);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export async function readStoredSessionToken() {
  return SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
}

export async function readStoredRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
}

export async function replaceStoredSessionTokens(payload: {
  accessToken: string;
  refreshToken: string | null;
}) {
  await persistSessionTokens(payload);
  useSessionStore.setState((state) => ({
    ...state,
    refreshToken: payload.refreshToken,
    token: payload.accessToken,
  }));
}

export const useSessionStore = create<AppSessionStore>((set) => ({
  bootstrapStatus: 'idle',
  identity: null,
  onboarding: null,
  profile: null,
  refreshToken: null,
  token: null,
  clearSession: async () => {
    await persistSessionTokens({ accessToken: null, refreshToken: null });
    set({
      bootstrapStatus: 'ready',
      identity: null,
      onboarding: null,
      profile: null,
      refreshToken: null,
      token: null,
    });
  },
  hydrateStoredToken: (token) => {
    set({
      bootstrapStatus: 'ready',
      identity: null,
      onboarding: null,
      profile: null,
      refreshToken: null,
      token,
    });
  },
  replaceStoredSessionTokens: async ({ accessToken, refreshToken }) => {
    await persistSessionTokens({ accessToken, refreshToken });
    set((state) => ({
      ...state,
      refreshToken,
      token: accessToken,
    }));
  },
  setBootstrapStatus: (status) => {
    set({ bootstrapStatus: status });
  },
  setSession: async ({ identity, onboarding, profile, refreshToken = null, token }) => {
    await persistSessionTokens({ accessToken: token, refreshToken });
    set({
      bootstrapStatus: 'ready',
      identity,
      onboarding,
      profile,
      refreshToken,
      token,
    });
  },
}));
