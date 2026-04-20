import React from 'react';
import { ScrollView } from 'react-native';

type LearningConversationScrollProps = React.ComponentProps<typeof ScrollView> & {
  focusAnchorOffset?: number;
  focusAnchorY?: number | null;
};

export function LearningConversationScroll({
  focusAnchorOffset = 72,
  focusAnchorY = null,
  onContentSizeChange,
  onLayout,
  ...props
}: LearningConversationScrollProps) {
  const scrollViewRef = React.useRef<ScrollView | null>(null);

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
    if (typeof focusAnchorY !== 'number') {
      return;
    }

    scrollToLatestMessage();
  }, [focusAnchorY, scrollToLatestMessage]);

  return (
    <ScrollView
      {...props}
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
