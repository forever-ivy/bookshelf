import { Redirect } from 'expo-router';

import { appRoutes } from '@/lib/app/routes';

export default function MemberFormScreen() {
  return <Redirect href={appRoutes.settingsMembers} />;
}
