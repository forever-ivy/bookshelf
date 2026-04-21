import React from 'react';
import { Keyboard, Platform, ScrollView } from 'react-native';

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
  const layoutHeightRef = React.useRef(0);
  const contentHeightRef = React.useRef(0);
  const keyboardFollowTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnchorTargetRef = React.useRef<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  // Returns true when the content is taller than the visible scroll area,
  // i.e. there is content below the fold that the user cannot see.
  const isContentOverflowing = React.useCallback(() => {
    return contentHeightRef.current > layoutHeightRef.current + 10;
  }, []);

  const scrollToEnd = React.useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // Scroll to the latest user message (anchor) or to end.
  // Only scrolls to end if content overflows — otherwise content sits at top
  // like a fresh ChatGPT conversation.
  const scrollToLatestMessage = React.useCallback(() => {
    requestAnimationFrame(() => {
      if (typeof focusAnchorY === 'number') {
        const targetY = Math.max(0, focusAnchorY - focusAnchorOffset);
        if (lastAnchorTargetRef.current === targetY) {
          return;
        }

        lastAnchorTargetRef.current = targetY;
        scrollViewRef.current?.scrollTo({
          animated: false,
          y: targetY,
        });
        return;
      }

      if (isKeyboardVisible) {
        lastAnchorTargetRef.current = null;
        scrollViewRef.current?.scrollToEnd({ animated: false });
        return;
      }

      lastAnchorTargetRef.current = null;

      // Only auto-scroll when content exceeds viewport
      if (isContentOverflowing()) {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }
    });
  }, [focusAnchorOffset, focusAnchorY, isContentOverflowing, isKeyboardVisible]);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const clearKeyboardFollowTimeout = () => {
      if (keyboardFollowTimeoutRef.current) {
        clearTimeout(keyboardFollowTimeoutRef.current);
        keyboardFollowTimeoutRef.current = null;
      }
    };

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      clearKeyboardFollowTimeout();
      keyboardFollowTimeoutRef.current = setTimeout(() => {
        if (typeof focusAnchorY !== 'number') {
          scrollToEnd(false);
        }
      }, 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      clearKeyboardFollowTimeout();
      setIsKeyboardVisible(false);
    });

    return () => {
      clearKeyboardFollowTimeout();
      showSub.remove();
      hideSub.remove();
    };
  }, [focusAnchorY, scrollToEnd]);

  React.useEffect(() => {
    scrollToLatestMessage();
  }, [focusAnchorY, isKeyboardVisible, scrollToLatestMessage]);

  return (
    <ScrollView
      {...props}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      onContentSizeChange={(width, height) => {
        contentHeightRef.current = height;
        onContentSizeChange?.(width, height);
        scrollToLatestMessage();
      }}
      onLayout={(event) => {
        layoutHeightRef.current = event.nativeEvent.layout.height;
        onLayout?.(event);
        scrollToLatestMessage();
      }}
      ref={scrollViewRef}
    />
  );
}
