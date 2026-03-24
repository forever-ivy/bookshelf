import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

export function PageShell({
  backgroundDecoration,
  children,
  insetBottom = 120,
  mode = 'discovery',
  padded = true,
}: {
  backgroundDecoration?: React.ReactNode;
  children: React.ReactNode;
  insetBottom?: number;
  mode?: 'discovery' | 'task' | 'workspace';
  padded?: boolean;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const backgroundColor =
    mode === 'workspace'
      ? theme.colors.backgroundWorkspace
      : mode === 'task'
        ? theme.colors.backgroundTask
        : theme.colors.background;

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
      <ScrollView
        bounces={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: theme.spacing.xxl,
          paddingBottom: insets.bottom + insetBottom,
          paddingHorizontal: padded ? theme.spacing.xl : 0,
          paddingTop: theme.spacing.lg,
        }}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}
