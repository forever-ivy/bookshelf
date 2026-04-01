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
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 14,
          },
          radiusStyle,
        ]}
        testID={testID}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: 14,
          }}>
          <LoadingSkeletonBlock borderRadius={theme.radii.md} height={56} width={56} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
              <LoadingSkeletonBlock borderRadius={theme.radii.md} height={22} width={92} />
              <LoadingSkeletonBlock height={12} width="34%" />
            </View>
            <LoadingSkeletonBlock height={18} width="56%" />
            <LoadingSkeletonBlock height={14} width="38%" />
            <LoadingSkeletonBlock height={12} width="28%" />
            <LoadingSkeletonBlock height={12} width="64%" />
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={34} width={62} />
          </View>
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
