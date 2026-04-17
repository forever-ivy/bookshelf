import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function LearningSessionRoute() {
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = params.profileId ?? '';

  return <Redirect href={`/learning/${profileId}/guide`} />;
}
