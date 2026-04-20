import React from 'react';
import { Platform, ScrollView } from 'react-native';

type LearningConversationScrollProps = React.ComponentProps<typeof ScrollView> & {
  focusAnchorOffset?: number;
  focusAnchorY?: number | null;
  onScrollToEndRequest?: (fn: () => void) => void;
};

export function LearningConversationScroll({
  focusAnchorOffset = 72,
  focusAnchorY = null,
  onContentSizeChange,
  onLayout,
  onScrollToEndRequest,
  ...props
}: LearningConversationScrollProps) {
  const scrollViewRef = React.useRef<ScrollView | null>(null);

  const scrollToEnd = React.useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const scrollToLatestMessage = React.useCallback(() => {
    requestAnimationFrame(() => {
      if (typeof focusAnchorY === 'number') {
        scrollViewRef.current?.scrollTo({
          animated: false,
          y: Math.max(0, focusAnchorY - focusAnchorOffset),
        });
        return;
      }

      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
  }, [focusAnchorOffset, focusAnchorY]);

  React.useEffect(() => {
    onScrollToEndRequest?.(scrollToEnd);
  }, [onScrollToEndRequest, scrollToEnd]);

  React.useEffect(() => {
    if (typeof focusAnchorY !== 'number') {
      return;
    }

    scrollToLatestMessage();
  }, [focusAnchorY, scrollToLatestMessage]);

  return (
    <ScrollView
      {...props}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      onContentSizeChange={(width, height) => {
        onContentSizeChange?.(width, height);
        scrollToLatestMessage();
      }}
      onLayout={(event) => {
        onLayout?.(event);
        scrollToLatestMessage();
      }}
      ref={scrollViewRef}
    />
  );
}
