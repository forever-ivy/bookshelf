import { ThemeProvider } from '@react-navigation/core';
import { DefaultTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SystemUI from 'expo-system-ui';
import React from 'react';

import { appTheme } from '@/constants/app-theme';
import { getMe } from '@/lib/api';
import { isLibraryAuthError } from '@/lib/api/client';
import { createAppQueryClient } from '@/lib/app/query-client';
import { useSessionStore } from '@/stores';
import { readStoredSessionToken } from '@/stores/session-store';

type AppProvidersProps = {
  children: React.ReactNode;
};

const APP_BACKGROUND_COLOR = appTheme.colors.background;
const APP_NAVIGATION_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: appTheme.colors.background,
    border: appTheme.colors.borderSoft,
    card: appTheme.colors.background,
    notification: appTheme.colors.warning,
    primary: appTheme.colors.primaryStrong,
    text: appTheme.colors.text,
  },
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = React.useState(() => createAppQueryClient());
  const clearSession = useSessionStore((state) => state.clearSession);
  const hydrateStoredToken = useSessionStore((state) => state.hydrateStoredToken);
  const setBootstrapStatus = useSessionStore((state) => state.setBootstrapStatus);
  const setSession = useSessionStore((state) => state.setSession);

  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(APP_BACKGROUND_COLOR).catch(() => null);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      setBootstrapStatus('loading');
      const token = await readStoredSessionToken();
      if (!token) {
        if (!cancelled) {
          setBootstrapStatus('ready');
        }
        return;
      }

      try {
        const session = await getMe(token);
        if (!cancelled) {
          await setSession({
            identity: session.identity,
            onboarding: session.onboarding,
            profile: session.profile,
            refreshToken: session.refreshToken ?? null,
            token: session.accessToken,
          });
        }
      } catch (error) {
        if (!cancelled) {
          if (isLibraryAuthError(error)) {
            await clearSession();
          } else {
            hydrateStoredToken(token);
          }
        }
      }
    }

    bootstrapSession().catch(() => {
      setBootstrapStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [clearSession, hydrateStoredToken, setBootstrapStatus, setSession]);

  return (
    <ThemeProvider value={APP_NAVIGATION_THEME}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
