import { ThemeProvider } from '@react-navigation/core';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SystemUI from 'expo-system-ui';
import React from 'react';

import { useAppTheme } from '@/hooks/use-app-theme';
import { getMe } from '@/lib/api';
import { isLibraryAuthError } from '@/lib/api/client';
import { createAppQueryClient } from '@/lib/app/query-client';
import { useSessionStore } from '@/stores';
import { readStoredSessionToken } from '@/stores/session-store';

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const { isDark, theme } = useAppTheme();
  const [queryClient] = React.useState(() => createAppQueryClient());
  const clearSession = useSessionStore((state) => state.clearSession);
  const hydrateStoredToken = useSessionStore((state) => state.hydrateStoredToken);
  const setBootstrapStatus = useSessionStore((state) => state.setBootstrapStatus);
  const setSession = useSessionStore((state) => state.setSession);
  const navigationTheme = React.useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: theme.colors.background,
        border: theme.colors.borderSoft,
        card: theme.colors.background,
        notification: theme.colors.warning,
        primary: theme.colors.primaryStrong,
        text: theme.colors.text,
      },
      dark: isDark,
    };
  }, [isDark, theme]);

  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => null);
  }, [theme]);

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
    <ThemeProvider value={navigationTheme}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
