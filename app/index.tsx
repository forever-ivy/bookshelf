import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { bookleafTheme } from '@/constants/bookleaf-theme';
import { getInitialHref } from '@/lib/navigation';
import { useSessionStore } from '@/stores/session-store';

export default function IndexRoute() {
  const hasConnection = useSessionStore((state) => state.hasConnection);
  const hydrated = useSessionStore((state) => state.hydrated);

  if (!hydrated) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: bookleafTheme.colors.background,
          flex: 1,
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={bookleafTheme.colors.primaryStrong} />
      </View>
    );
  }

  return <Redirect href={getInitialHref(hasConnection)} />;
}
