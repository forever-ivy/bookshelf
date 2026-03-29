import { useMemo } from 'react';

import { useSessionStore } from '@/stores';

export function useAppSession() {
  const bootstrapStatus = useSessionStore((state) => state.bootstrapStatus);
  const clearSession = useSessionStore((state) => state.clearSession);
  const hydrateStoredToken = useSessionStore((state) => state.hydrateStoredToken);
  const identity = useSessionStore((state) => state.identity);
  const onboarding = useSessionStore((state) => state.onboarding);
  const profile = useSessionStore((state) => state.profile);
  const setBootstrapStatus = useSessionStore((state) => state.setBootstrapStatus);
  const setSession = useSessionStore((state) => state.setSession);
  const token = useSessionStore((state) => state.token);

  return useMemo(
    () => ({
      bootstrapStatus,
      clearSession,
      hydrateStoredToken,
      identity,
      isAuthenticated: Boolean(token),
      onboarding,
      profile,
      setBootstrapStatus,
      setSession,
      token,
    }),
    [
      bootstrapStatus,
      clearSession,
      hydrateStoredToken,
      identity,
      onboarding,
      profile,
      setBootstrapStatus,
      setSession,
      token,
    ]
  );
}
