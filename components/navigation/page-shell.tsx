import { usePathname } from 'expo-router';
import React from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shouldShowSecondaryBackButton } from '@/components/navigation/global-secondary-back-layer';
import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppTheme } from '@/hooks/use-app-theme';

const HEADER_TITLE_ANIMATION_DURATION = 220;
const HEADER_TITLE_LINE_HEIGHT = 36;
const HEADER_TITLE_HIDE_OFFSET = -8;

function resolveKeyboardAnimationDuration(event?: { duration?: number }) {
  return typeof event?.duration === 'number' && event.duration > 0
    ? event.duration
    : HEADER_TITLE_ANIMATION_DURATION;
}

export function PageShell({
  backgroundDecoration,
  children,
  headerContent,
  headerDescription,
  headerTitle,
  keyboardAware = false,
  hideHeaderTitleWhenKeyboardVisible = false,
  insetBottom = 120,
  mode = 'discovery',
  padded = true,
  scrollEnabled = true,
  scrollViewResetKey,
  showBackButton = false,
}: {
  backgroundDecoration?: React.ReactNode;
  children?: React.ReactNode;
  headerContent?: React.ReactNode;
  headerDescription?: string;
  headerTitle?: string;
  keyboardAware?: boolean;
  hideHeaderTitleWhenKeyboardVisible?: boolean;
  insetBottom?: number;
  mode?: 'discovery' | 'task' | 'workspace';
  padded?: boolean;
  scrollEnabled?: boolean;
  scrollViewResetKey?: number | string;
  showBackButton?: boolean;
}) {
  const { theme } = useAppTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const shouldAnimateHeaderTitle = hideHeaderTitleWhenKeyboardVisible && Boolean(headerTitle);
  const shouldHideHeaderTitle = shouldAnimateHeaderTitle && isKeyboardVisible;
  const titleOpacity = React.useRef(new Animated.Value(headerTitle ? 1 : 0)).current;
  const titleTranslateY = React.useRef(new Animated.Value(0)).current;
  const backgroundColor =
    mode === 'workspace'
      ? theme.colors.backgroundWorkspace
      : mode === 'task'
        ? theme.colors.backgroundTask
        : theme.colors.background;
  const resolvedHeaderTitle = headerTitle;
  const hasHeader = Boolean(headerContent || resolvedHeaderTitle || headerDescription || showBackButton);
  const scrollTopPadding = hasHeader ? 0 : theme.spacing.lg;
  const titleSlotHeight = shouldHideHeaderTitle ? 0 : HEADER_TITLE_LINE_HEIGHT;
  const floatingBackButtonVisible = shouldShowSecondaryBackButton(pathname) && !showBackButton;
  const headerGap = showBackButton
    ? theme.spacing.md
    : floatingBackButtonVisible
      ? theme.spacing.xl
      : theme.spacing.lg;
  const headerCopyPaddingLeft = 0;
  const headerTopPadding = showBackButton
    ? theme.spacing.xs
    : floatingBackButtonVisible
      ? theme.spacing.xxxl + theme.spacing.xxxl + theme.spacing.xl
      : theme.spacing.lg;
  const scrollViewProps = keyboardAware
    ? {
        automaticallyAdjustKeyboardInsets: true,
        keyboardShouldPersistTaps: 'handled' as const,
      }
    : {};

  const runHeaderTitleAnimation = React.useCallback(
    (nextHidden: boolean, duration: number) => {
      titleOpacity.stopAnimation();
      titleTranslateY.stopAnimation();

      Animated.parallel([
        Animated.timing(titleOpacity, {
          duration,
          easing: nextHidden ? Easing.inOut(Easing.cubic) : Easing.out(Easing.cubic),
          toValue: nextHidden ? 0 : 1,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          duration,
          easing: nextHidden ? Easing.inOut(Easing.cubic) : Easing.out(Easing.cubic),
          toValue: nextHidden ? HEADER_TITLE_HIDE_OFFSET : 0,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [titleOpacity, titleTranslateY]
  );

  React.useEffect(() => {
    if (!hideHeaderTitleWhenKeyboardVisible) {
      setIsKeyboardVisible(false);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const duration = resolveKeyboardAnimationDuration(event);
      if (Platform.OS === 'ios') {
        Keyboard.scheduleLayoutAnimation(event);
      }
      if (shouldAnimateHeaderTitle) {
        runHeaderTitleAnimation(true, duration);
      }
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      const duration = resolveKeyboardAnimationDuration(event);
      if (Platform.OS === 'ios') {
        Keyboard.scheduleLayoutAnimation(event);
      }
      if (shouldAnimateHeaderTitle) {
        runHeaderTitleAnimation(false, duration);
      }
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [hideHeaderTitleWhenKeyboardVisible, runHeaderTitleAnimation, shouldAnimateHeaderTitle]);

  React.useEffect(() => {
    if (!headerTitle) {
      titleOpacity.stopAnimation();
      titleTranslateY.stopAnimation();
      titleOpacity.setValue(0);
      titleTranslateY.setValue(HEADER_TITLE_HIDE_OFFSET);
      return;
    }

    if (!shouldAnimateHeaderTitle) {
      titleOpacity.stopAnimation();
      titleTranslateY.stopAnimation();
      titleOpacity.setValue(1);
      titleTranslateY.setValue(0);
      return;
    }
  }, [headerTitle, shouldAnimateHeaderTitle, titleOpacity, titleTranslateY]);

  const shellContent = (
    <ScrollView
      bounces={false}
      contentInsetAdjustmentBehavior="automatic"
      key={scrollViewResetKey}
      contentContainerStyle={{
        flexGrow: keyboardAware ? 1 : undefined,
        gap: theme.spacing.xxl,
        paddingBottom: insets.bottom + insetBottom,
        paddingHorizontal: padded ? theme.spacing.xl : 0,
        paddingTop: scrollTopPadding,
      }}
      keyboardDismissMode="on-drag"
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}>
      {hasHeader ? (
        <View
          style={{
            gap: headerGap,
            paddingTop: headerTopPadding,
          }}
          testID="page-shell-header">
          {showBackButton ? <SecondaryBackButton /> : null}
          {headerContent ? (
            headerContent
          ) : resolvedHeaderTitle || headerDescription ? (
            <View
              style={{
                gap: theme.spacing.sm,
                paddingLeft: headerCopyPaddingLeft,
              }}
              testID="page-shell-header-copy">
              {resolvedHeaderTitle ? (
                shouldAnimateHeaderTitle ? (
                  <View
                    style={{
                      height: titleSlotHeight,
                      overflow: 'hidden',
                    }}
                    testID="page-shell-header-title-slot">
                    <Animated.View
                      style={{
                        opacity: titleOpacity,
                        transform: [{ translateY: titleTranslateY }],
                      }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          ...theme.typography.heading,
                          fontSize: 30,
                          letterSpacing: -0.7,
                          lineHeight: HEADER_TITLE_LINE_HEIGHT,
                        }}
                        testID="page-shell-header-title">
                        {resolvedHeaderTitle}
                      </Text>
                    </Animated.View>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.heading,
                      fontSize: 30,
                      letterSpacing: -0.7,
                      lineHeight: HEADER_TITLE_LINE_HEIGHT,
                    }}
                    testID="page-shell-header-title">
                    {resolvedHeaderTitle}
                  </Text>
                )
              ) : null}
              {headerDescription ? (
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 14,
                    lineHeight: 21,
                    maxWidth: 560,
                  }}>
                  {headerDescription}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );

  return (
    <View style={{ backgroundColor, flex: 1 }}>
      {backgroundDecoration ? (
        <View
          pointerEvents="none"
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}>
          {backgroundDecoration}
        </View>
      ) : null}
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          {shellContent}
        </KeyboardAvoidingView>
      ) : (
        shellContent
      )}
    </View>
  );
}
