import { act, renderHook } from '@testing-library/react-native';

import { useConversationFocusAnchor } from '@/hooks/use-conversation-focus-anchor';

describe('useConversationFocusAnchor', () => {
  it('preserves the resolved anchor while focus shifts to a new active turn', () => {
    const { result, rerender } = renderHook(
      ({ focusMessageId }) => useConversationFocusAnchor(focusMessageId),
      {
        initialProps: {
          focusMessageId: 'message-1' as string | null,
        },
      }
    );

    act(() => {
      result.current.setFocusAnchorY(320);
    });

    rerender({ focusMessageId: 'message-2' });

    expect(result.current.focusAnchorY).toBe(320);
  });

  it('clears the anchor when there is no active focus message', () => {
    const { result, rerender } = renderHook(
      ({ focusMessageId }) => useConversationFocusAnchor(focusMessageId),
      {
        initialProps: {
          focusMessageId: 'message-1' as string | null,
        },
      }
    );

    act(() => {
      result.current.setFocusAnchorY(320);
    });

    rerender({ focusMessageId: null });

    expect(result.current.focusAnchorY).toBeNull();
  });
});
