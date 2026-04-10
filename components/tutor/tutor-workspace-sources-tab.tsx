import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BookOpen, EllipsisVertical, FileText } from 'lucide-react-native';

import type { TutorWorkspaceDraftSource } from '@/components/tutor/tutor-workspace-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

function resolveDraftKindLabel(kind: TutorWorkspaceDraftSource['kind']) {
  switch (kind) {
    case 'pdf':
      return 'PDF';
    case 'image':
      return 'IMAGE';
    case 'document':
    default:
      return 'DOC';
  }
}

export function TutorWorkspaceSourcesTab({
  draftSources,
  heading = '来源',
  onAddSource,
  onOpenDetails,
  sourceLabel,
  title,
}: {
  draftSources: TutorWorkspaceDraftSource[];
  heading?: string;
  onAddSource: () => void;
  onOpenDetails?: () => void;
  sourceLabel: string;
  title: string;
}) {
  const { theme } = useAppTheme();
  const SourceIcon = sourceLabel === 'PDF' ? FileText : BookOpen;

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
              <EllipsisVertical color={theme.colors.text} size={18} strokeWidth={2} />
            </View>
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

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
              <SourceIcon color={theme.colors.warning} size={20} strokeWidth={1.9} />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
                }}>
                {title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                  textTransform: 'uppercase',
                }}>
                {sourceLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 16,
            }}>
            已添加来源
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onAddSource}
            style={({ pressed }) => ({
              opacity: pressed ? 0.84 : 1,
            })}>
            <Text
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              添加文件来源
            </Text>
          </Pressable>
        </View>

        {draftSources.length === 0 ? (
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
              还没有额外文件
            </Text>
          </View>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {draftSources.map((source) => (
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
                  <FileText color={theme.colors.primaryStrong} size={20} strokeWidth={1.9} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.semiBold,
                      fontSize: 15,
                    }}>
                    {source.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSoft,
                      ...theme.typography.medium,
                      fontSize: 12,
                    }}>
                    {resolveDraftKindLabel(source.kind)} · {source.status === 'preparing' ? '准备中' : '已整理'} · {source.addedAt}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
