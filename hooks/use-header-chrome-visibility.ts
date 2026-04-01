import React from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export function useHeaderChromeVisibility({
  enabled = true,
  threshold = 12,
}: {
  enabled?: boolean;
  threshold?: number;
} = {}) {
  const [showHeaderChrome, setShowHeaderChrome] = React.useState(true);
  const showHeaderChromeRef = React.useRef(true);

  React.useEffect(() => {
    if (enabled) {
      return;
    }

    showHeaderChromeRef.current = true;
    setShowHeaderChrome(true);
  }, [enabled]);

  const onScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enabled) {
        return;
      }

      const nextShowHeaderChrome = (event.nativeEvent.contentOffset?.y ?? 0) <= threshold;

      if (showHeaderChromeRef.current === nextShowHeaderChrome) {
        return;
      }

      showHeaderChromeRef.current = nextShowHeaderChrome;
      setShowHeaderChrome(nextShowHeaderChrome);
    },
    [enabled, threshold]
  );

  return {
    onScroll,
    showHeaderChrome,
  } as const;
}
