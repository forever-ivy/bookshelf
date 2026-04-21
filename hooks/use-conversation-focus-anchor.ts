import React from 'react';

export function useConversationFocusAnchor(focusMessageId: string | null) {
  const [focusAnchorY, setFocusAnchorY] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!focusMessageId) {
      setFocusAnchorY(null);
    }
  }, [focusMessageId]);

  return {
    focusAnchorY,
    setFocusAnchorY,
  };
}
