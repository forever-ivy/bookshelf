import * as SecureStore from 'expo-secure-store';
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { ConnectionProfile } from '@/lib/app/connection';
import type { MemberSummary } from '@/lib/api/contracts/types';
import { createPreviewConnectionProfile } from '@/lib/app/preview-data';

type AuthAccountSummary = {
  id: number;
  phone?: string | null;
  system_role?: string | null;
  username?: string | null;
};

type PendingPairingContext = {
  pairCode: string;
  pairToken: string;
  requiresSetup: boolean;
};

type SessionStoreState = {
  authToken: string | null;
  connection: ConnectionProfile | null;
  currentAccount: AuthAccountSummary | null;
  currentMember: MemberSummary | null;
  currentMemberId: number | null;
  pendingPairing: PendingPairingContext | null;
  enterPreviewMode: () => void;
  hasConnection: boolean;
  hydrated: boolean;
  isAuthenticated: boolean;
  isPreviewMode: boolean;
  clearAuthSession: () => void;
  clearSession: () => void;
  clearPendingPairing: () => void;
  finishHydration: () => void;
  setAuthSession: (payload: {
    account: AuthAccountSummary;
    authToken: string;
    currentMember: MemberSummary;
  }) => void;
  setConnection: (connection: ConnectionProfile) => void;
  setCurrentMemberId: (memberId: number | null) => void;
  setPendingPairing: (pairing: PendingPairingContext | null) => void;
};

const secureStoreStorage: StateStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
};

const memoryStorageState = new Map<string, string>();

function createMemoryStorage(): StateStorage {
  return {
    getItem: async (name) => memoryStorageState.get(name) ?? null,
    removeItem: async (name) => {
      memoryStorageState.delete(name);
    },
    setItem: async (name, value) => {
      memoryStorageState.set(name, value);
    },
  };
}

function createWebStorage(storage: Storage): StateStorage {
  return {
    getItem: (name) => storage.getItem(name),
    removeItem: (name) => storage.removeItem(name),
    setItem: (name, value) => storage.setItem(name, value),
  };
}

type ResolveSessionStorageOptions = {
  canUseDom?: boolean;
  platform?: string;
};

export function resolveSessionStorage(options: ResolveSessionStorageOptions = {}): StateStorage {
  const platform = options.platform ?? process.env.EXPO_OS;
  const canUseDom = options.canUseDom ?? typeof window !== 'undefined';

  if (!canUseDom) {
    return createMemoryStorage();
  }

  if (platform === 'web') {
    return createWebStorage(window.localStorage);
  }

  return secureStoreStorage;
}

function createSessionState() {
  return {
    authToken: null,
    connection: null,
    currentAccount: null,
    currentMember: null,
    currentMemberId: null,
    hasConnection: false,
    hydrated: false,
    isAuthenticated: false,
    isPreviewMode: false,
    pendingPairing: null,
  };
}

export function createSessionStore() {
  return createStore<SessionStoreState>()(
    persist(
      (set) => ({
        ...createSessionState(),
        clearAuthSession: () =>
          set((state) => ({
            authToken: null,
            currentAccount: null,
            currentMember: null,
            currentMemberId: null,
            hasConnection: state.hasConnection,
            hydrated: true,
            isAuthenticated: false,
            isPreviewMode: state.isPreviewMode,
            pendingPairing: null,
            connection: state.connection,
          })),
        clearSession: () =>
          set({
            ...createSessionState(),
            hydrated: true,
          }),
        clearPendingPairing: () => set({ pendingPairing: null }),
        enterPreviewMode: () =>
          set({
            authToken: 'preview-token',
            connection: createPreviewConnectionProfile(),
            currentAccount: {
              id: 0,
              system_role: 'admin',
              username: 'preview-admin',
            },
            currentMember: {
              id: 2,
              name: '晴晴',
              role: 'child',
            },
            currentMemberId: 2,
            hasConnection: true,
            hydrated: true,
            isAuthenticated: true,
            isPreviewMode: true,
            pendingPairing: null,
          }),
        finishHydration: () => set({ hydrated: true }),
        setAuthSession: ({ account, authToken, currentMember }) =>
          set((state) => ({
            authToken,
            connection: state.connection,
            currentAccount: account,
            currentMember,
            currentMemberId: currentMember.id,
            hasConnection: Boolean(state.connection),
            hydrated: true,
            isAuthenticated: true,
            isPreviewMode: false,
            pendingPairing: null,
          })),
        setConnection: (connection) =>
          set({
            authToken: null,
            connection,
            currentAccount: null,
            currentMember: null,
            currentMemberId: null,
            hasConnection: true,
            isAuthenticated: false,
            isPreviewMode: false,
            pendingPairing: null,
          }),
        setCurrentMemberId: (memberId) => set({ currentMemberId: memberId }),
        setPendingPairing: (pairing) => set({ pendingPairing: pairing }),
      }),
      {
        name: 'bookleaf-session',
        onRehydrateStorage: () => () => {
          setTimeout(() => {
            sessionStore.getState().finishHydration();
          }, 0);
        },
        partialize: (state) => ({
          authToken: state.authToken,
          connection: state.connection,
          currentAccount: state.currentAccount,
          currentMember: state.currentMember,
          currentMemberId: state.currentMemberId,
          hasConnection: state.hasConnection,
          isAuthenticated: state.isAuthenticated,
          isPreviewMode: state.isPreviewMode,
          pendingPairing: state.pendingPairing,
        }),
        storage: createJSONStorage(() => resolveSessionStorage()),
      }
    )
  );
}

export const sessionStore = createSessionStore();

export function useSessionStore<T>(selector: (state: SessionStoreState) => T) {
  return useStore(sessionStore, selector);
}
