import React from 'react';
import { Keyboard, Platform, ScrollView, View } from 'react-native';

type LearningConversationScrollProps = React.ComponentProps<typeof ScrollView> & {
  focusAnchorOffset?: number;
  focusAnchorY?: number | null;
};

export function LearningConversationScroll({
  alwaysBounceVertical,
  bounces,
  children,
  focusAnchorOffset = 72,
  focusAnchorY = null,
  onContentSizeChange,
  onLayout,
  ...props
}: LearningConversationScrollProps) {
  const scrollViewRef = React.useRef<ScrollView | null>(null);
  const baseContentHeightRef = React.useRef(0);
  const layoutHeightRef = React.useRef(0);
  const keyboardFollowTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnchorTargetRef = React.useRef<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const [baseContentHeight, setBaseContentHeight] = React.useState(0);
  const [layoutHeight, setLayoutHeight] = React.useState(0);
  const isFocusAnchorActive = typeof focusAnchorY === 'number';

  const focusAnchorLift = React.useMemo(() => {
    if (typeof focusAnchorY !== 'number' || layoutHeight <= 0 || baseContentHeight <= 0) {
      return 0;
    }

    const idealTargetY = Math.max(0, focusAnchorY - focusAnchorOffset);
    const maxScrollYWithoutSpacer = Math.max(0, baseContentHeight - layoutHeight);

    return Math.max(0, idealTargetY - maxScrollYWithoutSpacer);
  }, [baseContentHeight, focusAnchorOffset, focusAnchorY, layoutHeight]);

  // Returns true when the content is taller than the visible scroll area,
  // i.e. there is content below the fold that the user cannot see.
  const isContentOverflowing = React.useCallback(() => {
    return baseContentHeightRef.current > layoutHeightRef.current + 10;
  }, []);

  const getMaxScrollY = React.useCallback(() => {
    return Math.max(0, baseContentHeightRef.current - layoutHeightRef.current);
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
        if (layoutHeightRef.current <= 0 || baseContentHeightRef.current <= 0) {
          return;
        }

        const idealTargetY = Math.max(0, focusAnchorY - focusAnchorOffset);
        const resolvedTargetY = Math.min(idealTargetY, getMaxScrollY());

        if (lastAnchorTargetRef.current === resolvedTargetY) {
          return;
        }

        lastAnchorTargetRef.current = resolvedTargetY;
        scrollViewRef.current?.scrollTo({
          animated: false,
          y: resolvedTargetY,
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
  }, [focusAnchorOffset, focusAnchorY, getMaxScrollY, isContentOverflowing, isKeyboardVisible]);

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
      alwaysBounceVertical={isFocusAnchorActive ? false : alwaysBounceVertical}
      bounces={isFocusAnchorActive ? false : bounces}
      onContentSizeChange={(width, height) => {
        onContentSizeChange?.(width, height);
        scrollToLatestMessage();
      }}
      onLayout={(event) => {
        layoutHeightRef.current = event.nativeEvent.layout.height;
        setLayoutHeight(event.nativeEvent.layout.height);
        onLayout?.(event);
        scrollToLatestMessage();
      }}
      ref={scrollViewRef}
    >
      <View
        collapsable={false}
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          baseContentHeightRef.current = nextHeight;
          setBaseContentHeight(nextHeight);
          scrollToLatestMessage();
        }}
        style={
          focusAnchorLift > 0
            ? {
                transform: [{ translateY: -focusAnchorLift }],
              }
            : undefined
        }
        testID="learning-conversation-scroll-content">
        {children}
      </View>
    </ScrollView>
  );
}
