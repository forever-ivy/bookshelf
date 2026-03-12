import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SystemUI from 'expo-system-ui';
import React from 'react';

import { bookleafTheme } from '@/constants/bookleaf-theme';
import { createAppQueryClient } from '@/lib/query-client';

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = React.useState(() => createAppQueryClient());

  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(bookleafTheme.colors.background).catch(() => null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
    </QueryClientProvider>
  );
}
