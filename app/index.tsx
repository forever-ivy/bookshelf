import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { getInitialHref } from '@/lib/app/navigation';
import { useSessionStore } from '@/stores/session-store';

export default function IndexRoute() {
  const { theme } = useBookleafTheme();
  const hasConnection = useSessionStore((state) => state.hasConnection);
  const hydrated = useSessionStore((state) => state.hydrated);
  const initialHref = getInitialHref(hasConnection);

  console.log('[startup] IndexRoute render', {
    hasConnection,
    hydrated,
  });

  if (!hydrated) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={theme.colors.primaryStrong} />
      </View>
    );
  }

  console.log('[startup] IndexRoute redirect', { initialHref });

  return <Redirect href={initialHref} />;
}
