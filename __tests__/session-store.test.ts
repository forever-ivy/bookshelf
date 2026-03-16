import { createConnectionProfile } from '@/lib/app/connection';
import { createSessionStore } from '@/stores/session-store';

describe('createSessionStore', () => {
  it('stores the connected cabinet and authenticated member identity', () => {
    const store = createSessionStore();
    const connection = createConnectionProfile('https://cabinet.example.com', 'Living Room');

    store.getState().setConnection(connection);
    store.getState().setAuthSession({
      account: {
        id: 1,
        system_role: 'admin',
        username: 'ivy-admin',
      },
      authToken: 'jwt-token',
      currentMember: {
        id: 12,
        name: 'Ivy',
        role: 'parent',
      },
    });

    expect(store.getState().connection?.baseUrl).toBe('https://cabinet.example.com');
    expect(store.getState().authToken).toBe('jwt-token');
    expect(store.getState().currentMemberId).toBe(12);
    expect(store.getState().isAuthenticated).toBe(true);
    expect(store.getState().hasConnection).toBe(true);
  });

  it('clears auth but keeps the cabinet binding when logging out', () => {
    const store = createSessionStore();
    const connection = createConnectionProfile('https://cabinet.example.com', 'Living Room');

    store.getState().setConnection(connection);
    store.getState().setAuthSession({
      account: {
        id: 1,
        system_role: 'user',
        username: 'kid-reader',
      },
      authToken: 'jwt-token',
      currentMember: {
        id: 7,
        name: 'Kid',
        role: 'child',
      },
    });
    store.getState().clearAuthSession();

    expect(store.getState().connection?.baseUrl).toBe('https://cabinet.example.com');
    expect(store.getState().authToken).toBeNull();
    expect(store.getState().currentMemberId).toBeNull();
    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().hasConnection).toBe(true);
  });

  it('clears the active session when disconnecting', () => {
    const store = createSessionStore();
    const connection = createConnectionProfile('https://cabinet.example.com', 'Living Room');

    store.getState().setConnection(connection);
    store.getState().setAuthSession({
      account: {
        id: 1,
        system_role: 'user',
        username: 'kid-reader',
      },
      authToken: 'jwt-token',
      currentMember: {
        id: 7,
        name: 'Kid',
        role: 'child',
      },
    });
    store.getState().clearSession();

    expect(store.getState().connection).toBeNull();
    expect(store.getState().authToken).toBeNull();
    expect(store.getState().currentMemberId).toBeNull();
    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().hasConnection).toBe(false);
  });
});
