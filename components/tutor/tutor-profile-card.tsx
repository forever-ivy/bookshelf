import { Link, type Href } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { TutorProfile } from '@/lib/api';

function resolveStatusCopy(status: TutorProfile['status']) {
  switch (status) {
    case 'ready':
      return '可开始';
    case 'failed':
      return '需重试';
    case 'queued':
      return '排队中';
    case 'processing':
    default:
      return '解析中';
  }
}

export function TutorProfileCard({
  currentStepTitle,
  href,
  profile,
  progressLabel,
}: {
  currentStepTitle?: string | null;
  href: Href;
  profile: TutorProfile;
  progressLabel?: string | null;
}) {
  const { theme } = useAppTheme();

  const card = (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => ({
        opacity: pressed ? 0.96 : 1,
        transform: [{ scale: pressed ? 0.992 : 1 }],
      })}>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          boxShadow: theme.shadows.card,
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        }}>
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.medium,
                fontSize: 11,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}>
              {profile.sourceType === 'book' ? '馆藏图书' : '上传资料'}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 20,
                lineHeight: 25,
              }}>
              {profile.title}
            </Text>
          </View>

          <View
            style={{
              backgroundColor:
                profile.status === 'ready'
                  ? theme.colors.successSoft
                  : profile.status === 'failed'
                    ? theme.colors.warningSoft
                    : theme.colors.primarySoft,
              borderRadius: theme.radii.pill,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}>
            <Text
              style={{
                color:
                  profile.status === 'ready'
                    ? theme.colors.success
                    : profile.status === 'failed'
                      ? theme.colors.warning
                      : theme.colors.primaryStrong,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              {resolveStatusCopy(profile.status)}
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surfaceKnowledge,
            borderRadius: theme.radii.lg,
            gap: 6,
            padding: theme.spacing.lg,
          }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {profile.persona.name}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 21,
            }}>
            {profile.persona.greeting}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radii.md,
              height: 40,
              justifyContent: 'center',
              width: 40,
            }}>
            <AppIcon color={theme.colors.primaryStrong} name="spark" size={18} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              {progressLabel ?? `${profile.curriculum.length} 个学习步骤`}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 13,
                lineHeight: 19,
              }}>
              {currentStepTitle ?? profile.curriculum[0]?.title ?? '等待开始学习'}
            </Text>
          </View>
          <AppIcon color={theme.colors.textSoft} name="chevronRight" size={18} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <Link asChild href={href}>
      {card}
    </Link>
  );
}
