import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BookOpen, EllipsisVertical, FileText } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import type { TutorWorkspaceSourceCard } from '@/lib/tutor/workspace';

const EllipsisIcon = EllipsisVertical as React.ComponentType<any>;

function resolveSourceIcon(meta: string) {
  return meta.includes('BOOK') ? BookOpen : FileText;
}

export function TutorWorkspaceSourcesTab({
  heading = '来源',
  onOpenDetails,
  sourceCards,
}: {
  heading?: string;
  onOpenDetails?: () => void;
  sourceCards: TutorWorkspaceSourceCard[];
}) {
  const { theme } = useAppTheme();
  const primarySource = sourceCards[0] ?? null;
  const additionalSources = sourceCards.slice(1);
  const PrimarySourceIcon = primarySource
    ? (resolveSourceIcon(primarySource.meta) as React.ComponentType<any>)
    : null;

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 22,
          }}>
          {heading}
        </Text>

        {onOpenDetails ? (
          <Pressable
            accessibilityLabel="打开导学详情"
            accessibilityRole="button"
            onPress={onOpenDetails}
            style={({ pressed }) => ({
              opacity: pressed ? 0.82 : 1,
            })}>
            <View
              style={{
                alignItems: 'center',
                borderRadius: theme.radii.pill,
                height: 34,
                justifyContent: 'center',
                width: 34,
              }}>
              <EllipsisIcon color={theme.colors.text} size={18} strokeWidth={2} />
            </View>
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {primarySource ? (
        <View style={{ gap: theme.spacing.md }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 16,
          }}>
          当前主来源
        </Text>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 18,
          }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.colors.warningSoft,
                borderRadius: theme.radii.md,
                height: 42,
                justifyContent: 'center',
                width: 42,
              }}>
              {PrimarySourceIcon ? (
                <PrimarySourceIcon
                  color={theme.colors.warning}
                  size={20}
                  strokeWidth={1.9}
                />
              ) : null}
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
                }}>
                {primarySource.title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                  textTransform: 'uppercase',
                }}>
                {primarySource.meta}
              </Text>
            </View>
          </View>
        </View>
      </View>
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 16,
          }}>
          {primarySource && additionalSources.length > 0 ? '其他来源' : '来源详情'}
        </Text>

        {additionalSources.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.colors.surfaceKnowledge,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.lg,
            }}>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              {primarySource?.excerpt ?? '来源信息正在准备中。'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {additionalSources.map((source) => {
              const AdditionalSourceIcon = resolveSourceIcon(source.meta) as React.ComponentType<any>;

              return (
                <View
                key={source.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderSoft,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: theme.spacing.md,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: 16,
                }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: theme.colors.primarySoft,
                    borderRadius: theme.radii.md,
                    height: 42,
                    justifyContent: 'center',
                    width: 42,
                  }}>
                  <AdditionalSourceIcon
                    color={theme.colors.primaryStrong}
                    size={20}
                    strokeWidth={1.9}
                  />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.semiBold,
                      fontSize: 15,
                    }}>
                    {source.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSoft,
                      ...theme.typography.medium,
                      fontSize: 12,
                    }}>
                    {source.meta}
                  </Text>
                </View>
              </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
