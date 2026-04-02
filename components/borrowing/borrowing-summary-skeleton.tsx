import React from 'react';
import { View } from 'react-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
} from '@/components/base/loading-skeleton';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BorrowingSummarySkeleton() {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard style={{ gap: theme.spacing.lg }} testID="borrowing-summary-skeleton">
      <LoadingSkeletonBlock height={28} width="42%" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {Array.from({ length: 3 }, (_, index) => (
          <View
            key={`borrowing-summary-skeleton-${index}`}
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
            <LoadingSkeletonBlock height={18} width="54%" />
            <LoadingSkeletonBlock height={12} width="48%" />
          </View>
        ))}
      </View>
      <View
        style={{
          backgroundColor: theme.colors.warningSoft,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
        }}>
        <LoadingSkeletonBlock height={10} width={96} />
        <LoadingSkeletonBlock height={14} width="72%" />
      </View>
    </LoadingSkeletonCard>
  );
}
