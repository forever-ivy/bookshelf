import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function LearningWorkspaceGuideLegacyRoute() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();

  return <Redirect href={`/learning/${profileId ?? ''}/study?mode=guide`} />;
}
