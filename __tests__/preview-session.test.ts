import { createSessionStore } from '@/stores/session-store';

describe('preview session', () => {
  it('enters preview mode with a synthetic cabinet connection', () => {
    const store = createSessionStore();

    store.getState().enterPreviewMode();

    expect(store.getState().isPreviewMode).toBe(true);
    expect(store.getState().hasConnection).toBe(true);
    expect(store.getState().connection?.baseUrl).toBe('preview://cabinet');
    expect(store.getState().connection?.displayName).toBe('预览书柜');
  });
});
