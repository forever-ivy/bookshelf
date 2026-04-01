import { useRouter } from 'expo-router';
import React from 'react';

import { MeScreenContent } from '@/components/me/me-screen-content';
import { PageShell } from '@/components/navigation/page-shell';

export default function MeRoute() {
  const router = useRouter();

  return (
    <PageShell mode="task">
      <MeScreenContent onProfilePress={() => router.push('/profile')} />
    </PageShell>
  );
}
