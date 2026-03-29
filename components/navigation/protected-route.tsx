import React from 'react';

import { AppSessionGate } from '@/components/navigation/app-session-gate';
import { useAppSession } from '@/hooks/use-app-session';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAppSession();

  return <AppSessionGate sessionState={session}>{children}</AppSessionGate>;
}
