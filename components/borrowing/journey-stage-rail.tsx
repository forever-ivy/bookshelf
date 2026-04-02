import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import type { UnifiedJourneyStage } from '@/lib/borrowing/order-journey';

type JourneyStageRailProps = {
  accentColor: string;
  stages: UnifiedJourneyStage[];
};

const compactStageLabels: Record<UnifiedJourneyStage['key'], string> = {
  active: '借阅中',
  fulfillment: '配送中',
  processing: '处理中',
  requested: '下单',
  returned: '已归还',
};

export function JourneyStageRail({ accentColor, stages }: JourneyStageRailProps) {
  const { theme } = useAppTheme();
  const currentStageIndex = stages.findIndex((stage) => stage.state === 'current');
  const progressRatio =
    stages.length > 1 && currentStageIndex >= 0 ? currentStageIndex / (stages.length - 1) : 0;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          minHeight: 24,
          paddingHorizontal: theme.spacing.xs,
          position: 'relative',
        }}>
        <View
          style={{
            left: 16,
            position: 'absolute',
            right: 16,
            top: 10,
            borderRadius: 999,
            height: 4,
            overflow: 'hidden',
          }}>
          <View
            style={{
              backgroundColor: theme.colors.borderSoft,
              borderRadius: 999,
              height: 4,
              width: '100%',
            }}
          />
          <View
            style={{
              backgroundColor: accentColor,
              borderRadius: 999,
              height: 4,
              left: 0,
              position: 'absolute',
              top: 0,
              width: `${progressRatio * 100}%`,
            }}
          />
        </View>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          {stages.map((stage) => {
            const isCurrent = stage.state === 'current';
            const isDone = stage.state === 'done';

            return (
              <View
                key={stage.key}
                style={{
                  alignItems: 'center',
                  height: 24,
                  justifyContent: 'center',
                  width: 32,
                }}>
                <View
                  style={{
                    backgroundColor: isCurrent
                      ? accentColor
                      : isDone
                        ? theme.colors.primaryStrong
                        : theme.colors.surface,
                    borderColor: isCurrent
                      ? theme.colors.surfaceTint
                      : isDone
                        ? theme.colors.primaryStrong
                        : theme.colors.borderStrong,
                    borderRadius: 999,
                    borderWidth: isCurrent ? 5 : 1,
                    height: isCurrent ? 22 : 14,
                    width: isCurrent ? 22 : 14,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        {stages.map((stage) => (
          <View key={stage.key} style={{ alignItems: 'center', flex: 1, paddingHorizontal: 2 }}>
            <Text
              style={{
                color: stage.state === 'upcoming' ? theme.colors.textSoft : theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 11,
                lineHeight: 14,
                textAlign: 'center',
              }}>
              {compactStageLabels[stage.key]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
