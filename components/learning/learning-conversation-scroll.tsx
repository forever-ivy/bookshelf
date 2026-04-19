import React from 'react';
import { ScrollView } from 'react-native';

type LearningConversationScrollProps = React.ComponentProps<typeof ScrollView>;

export function LearningConversationScroll({
  onContentSizeChange,
  onLayout,
  ...props
}: LearningConversationScrollProps) {
  const scrollViewRef = React.useRef<ScrollView | null>(null);

  const scrollToLatestMessage = React.useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

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
