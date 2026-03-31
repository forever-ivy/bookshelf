import React from 'react';
import { View } from 'react-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SearchResultCardSkeleton({
  listPosition = 'single',
  testID,
  variant = 'card',
}: {
  listPosition?: 'first' | 'last' | 'middle' | 'single';
  testID?: string;
  variant?: 'card' | 'list';
}) {
  const { theme } = useAppTheme();

  if (variant === 'list') {
    const radiusStyle =
      listPosition === 'single'
        ? {
            borderRadius: theme.radii.xl,
          }
        : listPosition === 'first'
          ? {
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            }
          : listPosition === 'last'
            ? {
                borderBottomLeftRadius: theme.radii.xl,
                borderBottomRightRadius: theme.radii.xl,
              }
            : null;

    return (
      <View
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderTopColor:
              listPosition === 'first' || listPosition === 'single'
                ? 'transparent'
                : theme.colors.borderSoft,
            borderTopWidth: listPosition === 'first' || listPosition === 'single' ? 0 : 1,
            flexDirection: 'row',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
          },
          radiusStyle,
        ]}
        testID={testID}>
        <LoadingSkeletonBlock borderRadius={theme.radii.md} height={58} width={44} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm }}>
            <LoadingSkeletonBlock borderRadius={theme.radii.md} height={22} width={92} />
            <LoadingSkeletonBlock height={12} width="38%" />
          </View>
          <LoadingSkeletonText lineHeight={16} widths={['72%', '45%']} />
          <LoadingSkeletonBlock height={12} width="32%" />
          <LoadingSkeletonBlock height={12} width="62%" />
        </View>
      </View>
    );
  }

  return (
    <LoadingSkeletonCard style={{ gap: theme.spacing.md }} testID={testID}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <LoadingSkeletonBlock borderRadius={theme.radii.md} height={92} width={68} />
        <View style={{ flex: 1, gap: 10 }}>
          <LoadingSkeletonBlock borderRadius={theme.radii.md} height={24} width={96} />
          <LoadingSkeletonText lineHeight={18} widths={['78%', '42%']} />
        </View>
      </View>
      <View
        style={{
          borderTopColor: theme.colors.borderSoft,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: theme.spacing.md,
          paddingTop: theme.spacing.md,
        }}>
        <View style={{ flex: 1, gap: 6 }}>
          <LoadingSkeletonBlock height={12} width="42%" />
          <LoadingSkeletonBlock height={16} width="68%" />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <LoadingSkeletonBlock height={12} width="42%" />
          <LoadingSkeletonBlock height={16} width="58%" />
        </View>
      </View>
      <LoadingSkeletonText lineHeight={12} widths={['94%', '88%']} />
      <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} />
    </LoadingSkeletonCard>
  );
}
