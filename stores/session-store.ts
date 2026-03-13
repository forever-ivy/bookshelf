import * as SecureStore from 'expo-secure-store';
import { useStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { ConnectionProfile } from '@/lib/app/connection';
import { createPreviewConnectionProfile } from '@/lib/app/preview-data';

type SessionStoreState = {
  connection: ConnectionProfile | null;
  currentMemberId: number | null;
  enterPreviewMode: () => void;
  hasConnection: boolean;
  hydrated: boolean;
  isPreviewMode: boolean;
  clearSession: () => void;
  finishHydration: () => void;
  setConnection: (connection: ConnectionProfile) => void;
  setCurrentMemberId: (memberId: number | null) => void;
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
    connection: null,
    currentMemberId: null,
    hasConnection: false,
    hydrated: false,
    isPreviewMode: false,
  };
}

export function createSessionStore() {
  return createStore<SessionStoreState>()(
    persist(
      (set) => ({
        ...createSessionState(),
        clearSession: () =>
          set({
            ...createSessionState(),
            hydrated: true,
          }),
        enterPreviewMode: () =>
          set({
            connection: createPreviewConnectionProfile(),
            currentMemberId: 2,
            hasConnection: true,
            hydrated: true,
            isPreviewMode: true,
          }),
        finishHydration: () => set({ hydrated: true }),
        setConnection: (connection) =>
          set({
            connection,
            currentMemberId: null,
            hasConnection: true,
            isPreviewMode: false,
          }),
        setCurrentMemberId: (memberId) => set({ currentMemberId: memberId }),
      }),
      {
        name: 'bookleaf-session',
        onRehydrateStorage: () => () => {
          setTimeout(() => {
            sessionStore.getState().finishHydration();
          }, 0);
        },
        partialize: (state) => ({
          connection: state.connection,
          currentMemberId: state.currentMemberId,
          hasConnection: state.hasConnection,
          isPreviewMode: state.isPreviewMode,
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
