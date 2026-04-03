import React from 'react';
import { Text, View } from 'react-native';

import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppTheme } from '@/hooks/use-app-theme';

type ToolbarHeaderRowProps = {
  showBackButton?: boolean;
  title?: string;
};

export function ToolbarHeaderRow({ showBackButton = false, title }: ToolbarHeaderRowProps) {
  const { theme } = useAppTheme();
  const hasTitle = Boolean(title?.trim());

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: showBackButton ? theme.spacing.xs : 0,
        minHeight: 44,
        minWidth: 132,
      }}
      testID="toolbar-header-row">
      {showBackButton ? <SecondaryBackButton testID="toolbar-header-row-back-button" variant="inline" /> : null}
      {hasTitle ? (
        <View
          style={{
            flexShrink: 1,
            justifyContent: 'center',
            minHeight: 44,
          }}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 30,
              letterSpacing: -0.7,
              lineHeight: 36,
            }}
            testID="toolbar-header-row-title">
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
