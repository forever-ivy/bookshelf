import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function LearningWorkspaceEntryRoute() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();

  return <Redirect href={`/learning/${profileId ?? ''}/guide`} />;
}
