import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function LearningWorkspaceExploreLegacyRoute() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();

  return <Redirect href={`/learning/${profileId ?? ''}/study?mode=explore`} />;
}
