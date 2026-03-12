import { resolveSessionStorage } from '@/stores/session-store';

describe('resolveSessionStorage', () => {
  it('falls back to in-memory storage during web or static rendering', async () => {
    const storage = resolveSessionStorage({ canUseDom: false, platform: 'web' });

    await storage.setItem('session', '{"connected":true}');

    expect(await storage.getItem('session')).toBe('{"connected":true}');

    await storage.removeItem('session');

    expect(await storage.getItem('session')).toBeNull();
  });
});
