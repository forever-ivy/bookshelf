import React from 'react';
import { Card, Skeleton, SkeletonGroup } from 'heroui-native';
import { type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type SkeletonWidth = number | `${number}%`;

type LoadingSkeletonBlockProps = {
  borderRadius?: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  width?: SkeletonWidth;
};

export function LoadingSkeletonBlock({
  borderRadius,
  height,
  style,
  testID,
  width = '100%',
}: LoadingSkeletonBlockProps) {
  const { theme } = useAppTheme();

  return (
    <Skeleton
      animation={{
        pulse: {
          duration: 920,
          maxOpacity: 1,
          minOpacity: 0.62,
        },
      }}
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: borderRadius ?? theme.radii.md,
          height,
          width,
        },
        style,
      ]}
      variant="pulse"
    />
  );
}

export function LoadingSkeletonText({
  gap = 8,
  lineHeight = 12,
  testIDPrefix,
  widths,
}: {
  gap?: number;
  lineHeight?: number;
  testIDPrefix?: string;
  widths: SkeletonWidth[];
}) {
  const { theme } = useAppTheme();

  return (
    <SkeletonGroup
      animation={{
        pulse: {
          duration: 920,
          maxOpacity: 1,
          minOpacity: 0.62,
        },
      }}
      isLoading
      style={{ gap }}
      variant="pulse">
      {widths.map((width, index) => (
        <SkeletonGroup.Item
          key={`${testIDPrefix ?? 'skeleton-line'}-${index}`}
          testID={testIDPrefix ? `${testIDPrefix}-${index + 1}` : undefined}
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
            height: lineHeight,
            width,
          }}
        />
      ))}
    </SkeletonGroup>
  );
}

export function LoadingSkeletonCard({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <Card
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
        },
        style,
      ]}
      testID={testID}>
      {children}
    </Card>
  );
}
