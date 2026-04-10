import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function TutorSessionRoute() {
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = params.profileId ?? '';

  return <Redirect href={`/tutor/${profileId}`} />;
}
