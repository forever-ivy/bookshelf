import React from 'react';
import { View } from 'react-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BorrowingCardSkeleton({ testID }: { testID?: string }) {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard
      style={{
        flexDirection: 'row',
        gap: theme.spacing.lg,
      }}
      testID={testID}>
      <LoadingSkeletonBlock borderRadius={theme.radii.md} height={96} width={70} />
      <View style={{ flex: 1, gap: theme.spacing.md }}>
        <View style={{ gap: 8 }}>
          <LoadingSkeletonBlock borderRadius={theme.radii.md} height={24} width={92} />
          <LoadingSkeletonText lineHeight={16} widths={['76%', '42%']} />
        </View>
        <LoadingSkeletonText lineHeight={12} widths={['94%', '72%']} />
        <LoadingSkeletonBlock height={12} width="46%" />
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="58%" />
      </View>
    </LoadingSkeletonCard>
  );
}
