import { useRouter } from 'expo-router';
import React from 'react';

import { ProfileSheetContent } from '@/components/profile/profile-sheet-content';

export default function ProfileSheetRoute() {
  const router = useRouter();

  return (
    <ProfileSheetContent
      onDismiss={() => {
        router.back();
      }}
      scrollMode="react-native"
    />
  );
}
