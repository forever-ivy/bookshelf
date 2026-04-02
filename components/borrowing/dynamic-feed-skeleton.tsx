import React from 'react';
import { View } from 'react-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
} from '@/components/base/loading-skeleton';
import { useAppTheme } from '@/hooks/use-app-theme';

export function DynamicFeedSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.lg }} testID="borrowing-dynamic-skeleton">
      <LoadingSkeletonCard style={{ gap: theme.spacing.md }}>
        <LoadingSkeletonBlock height={18} width="30%" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {Array.from({ length: 3 }, (_, index) => (
            <View
              key={`dynamic-summary-skeleton-${index}`}
              style={{
                backgroundColor:
                  index === 0
                    ? theme.colors.primarySoft
                    : index === 1
                      ? theme.colors.warningSoft
                      : theme.colors.successSoft,
                borderRadius: theme.radii.md,
                flex: 1,
                gap: 6,
                padding: theme.spacing.md,
              }}>
              <LoadingSkeletonBlock height={16} width="45%" />
              <LoadingSkeletonBlock height={12} width="72%" />
            </View>
          ))}
        </View>
      </LoadingSkeletonCard>
      {Array.from({ length: 3 }, (_, index) => (
        <LoadingSkeletonCard key={`dynamic-card-skeleton-${index}`} style={{ gap: theme.spacing.sm }}>
          <LoadingSkeletonBlock height={16} width="36%" />
          <LoadingSkeletonBlock height={14} width="64%" />
          <LoadingSkeletonBlock height={12} width="82%" />
        </LoadingSkeletonCard>
      ))}
    </View>
  );
}
