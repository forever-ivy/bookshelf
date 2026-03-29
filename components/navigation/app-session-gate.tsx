import { Redirect } from 'expo-router';
import React from 'react';

import type { AppSessionSnapshot } from '@/stores';

type AppSessionGateProps = {
  children: React.ReactNode;
  sessionState: AppSessionSnapshot;
};

export function AppSessionGate({ children, sessionState }: AppSessionGateProps) {
  if (sessionState.bootstrapStatus !== 'ready') {
    return null;
  }

  if (!sessionState.token) {
    return <Redirect href="/login" />;
  }

  if (sessionState.onboarding?.needsProfileBinding) {
    return <Redirect href="/onboarding/profile" />;
  }

  if (sessionState.onboarding?.needsInterestSelection) {
    return <Redirect href="/onboarding/interests" />;
  }

  return <>{children}</>;
}
