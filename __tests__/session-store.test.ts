import { createConnectionProfile } from '@/lib/app/connection';
import { createSessionStore } from '@/stores/session-store';

describe('createSessionStore', () => {
  it('stores the connected cabinet and selected member', () => {
    const store = createSessionStore();
    const connection = createConnectionProfile('https://cabinet.example.com', 'Living Room');

    store.getState().setConnection(connection);
    store.getState().setCurrentMemberId(12);

    expect(store.getState().connection?.baseUrl).toBe('https://cabinet.example.com');
    expect(store.getState().currentMemberId).toBe(12);
    expect(store.getState().hasConnection).toBe(true);
  });

  it('clears the active session when disconnecting', () => {
    const store = createSessionStore();
    const connection = createConnectionProfile('https://cabinet.example.com', 'Living Room');

    store.getState().setConnection(connection);
    store.getState().setCurrentMemberId(7);
    store.getState().clearSession();

    expect(store.getState().connection).toBeNull();
    expect(store.getState().currentMemberId).toBeNull();
    expect(store.getState().hasConnection).toBe(false);
  });
});
