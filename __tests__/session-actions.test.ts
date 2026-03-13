import { performCabinetDisconnect } from '@/lib/app/session-actions';

describe('performCabinetDisconnect', () => {
  it('clears query cache before resetting the local cabinet session', () => {
    const clearQueries = jest.fn();
    const clearSession = jest.fn();

    performCabinetDisconnect({ clearQueries, clearSession });

    expect(clearQueries).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(clearQueries.mock.invocationCallOrder[0]).toBeLessThan(
      clearSession.mock.invocationCallOrder[0]
    );
  });
});
