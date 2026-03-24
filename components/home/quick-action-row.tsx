import React from 'react';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { SectionTitle } from '@/components/base/section-title';
import { homeQuickActions } from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

export function QuickActionRow() {
  const { theme } = useAppTheme();
  const [primaryAction, ...secondaryActions] = homeQuickActions;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <SectionTitle description="把借阅动作、配送状态和学习续接压成最短路径。" title="立即开始" />
      <View style={{ gap: theme.spacing.md }}>
        <View
          style={{
            backgroundColor: theme.colors.surfaceStrong,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            boxShadow: theme.shadows.card,
          }}>
          <View
            style={{
              gap: theme.spacing.lg,
              padding: theme.spacing.xl,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 22,
                  }}>
                  {primaryAction.title}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 18,
                  }}>
                  {primaryAction.meta}
                </Text>
              </View>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radii.lg,
                  height: 52,
                  justifyContent: 'center',
                  width: 52,
                }}>
                <AppIcon color={theme.colors.primaryStrong} name={primaryAction.icon} size={22} />
              </View>
            </View>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 15,
                lineHeight: 22,
              }}>
              {primaryAction.description}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {secondaryActions.map((item) => (
            <View
              key={item.title}
              style={{
                backgroundColor: theme.colors.surfaceTask,
                borderColor: theme.colors.borderSoft,
                borderRadius: theme.radii.xl,
                borderWidth: 1,
                boxShadow: theme.shadows.card,
                flex: 1,
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.md,
                  height: 44,
                  justifyContent: 'center',
                  width: 44,
                }}>
                <AppIcon color={theme.colors.primaryStrong} name={item.icon} size={18} />
              </View>
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 15,
                  }}>
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {item.meta}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 18,
                  }}>
                  {item.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
