import React from 'react';
import {
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

export function PageShell({
  backgroundDecoration,
  children,
  keyboardAware = false,
  insetBottom = 120,
  mode = 'discovery',
  onScroll,
  padded = true,
  scrollEnabled = true,
  scrollEventThrottle,
  scrollViewResetKey,
}: {
  backgroundDecoration?: React.ReactNode;
  children?: React.ReactNode;
  keyboardAware?: boolean;
  insetBottom?: number;
  mode?: 'discovery' | 'task' | 'workspace';
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  padded?: boolean;
  scrollEnabled?: boolean;
  scrollEventThrottle?: number;
  scrollViewResetKey?: number | string;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const backgroundColor =
    mode === 'workspace'
      ? theme.colors.backgroundWorkspace
      : mode === 'task'
        ? theme.colors.backgroundTask
        : theme.colors.background;
  const scrollViewProps = keyboardAware
    ? {
        automaticallyAdjustKeyboardInsets: true,
        keyboardShouldPersistTaps: 'handled' as const,
      }
    : {};

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
        paddingTop: theme.spacing.lg,
      }}
      keyboardDismissMode="on-drag"
      onScroll={onScroll}
      scrollEnabled={scrollEnabled}
      scrollEventThrottle={onScroll ? (scrollEventThrottle ?? 16) : undefined}
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}>
      {children}
    </ScrollView>
  );

  return (
    <View collapsable={false} style={{ backgroundColor, flex: 1 }}>
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
          collapsable={false}
          style={{ flex: 1 }}>
          {shellContent}
        </KeyboardAvoidingView>
      ) : (
        shellContent
      )}
    </View>
  );
}
