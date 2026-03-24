import { QueryClientProvider } from '@tanstack/react-query';
import * as SystemUI from 'expo-system-ui';
import React from 'react';

import { appTheme } from '@/constants/app-theme';
import { createAppQueryClient } from '@/lib/app/query-client';

type AppProvidersProps = {
  children: React.ReactNode;
};

const APP_BACKGROUND_COLOR = appTheme.colors.background;

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = React.useState(() => createAppQueryClient());

  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(APP_BACKGROUND_COLOR).catch(() => null);
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
