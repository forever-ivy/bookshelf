import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { meSummary } from '@/lib/app/mock-data';
import type { StudentProfile } from '@/lib/api/types';

function getFallbackHighlights(tagCount: number) {
  return [
    { label: '借阅节奏', value: '稳定中' },
    { label: '关注主题', value: `${tagCount} 个` },
    { label: 'AI 学习', value: '4 次' },
  ];
}

function compactReadingSummary(value: string | null | undefined) {
  if (!value) {
    return '先看框架';
  }

  const normalized = value.replace(/[。！]/g, '').trim();
  return normalized.length > 12 ? `${normalized.slice(0, 12)}…` : normalized;
}

function compactBadgeText(value: string) {
  const dayMatch = value.match(/(\d+)\s*天/);
  if (dayMatch) {
    return `${dayMatch[1]} 天连续`;
  }

  const aiMatch = value.match(/(\d+)\s*次/);
  if (aiMatch) {
    return `AI ${aiMatch[1]} 次`;
  }

  return value;
}

export function ProfileSummaryCard({
  highlights,
  onProfilePress,
  profile,
}: {
  highlights?: readonly { label: string; value: string }[];
  onProfilePress?: () => void;
  profile?: StudentProfile | null;
}) {
  const { theme } = useAppTheme();
  const activeProfile = profile ?? {
    accountId: 1,
    affiliationType: meSummary.role,
    college: meSummary.campus,
    displayName: meSummary.name,
    gradeYear: null,
    id: 1,
    interestTags: [...meSummary.interests],
    major: null,
    onboarding: {
      completed: true,
      needsInterestSelection: false,
      needsProfileBinding: false,
    },
    readingProfileSummary: meSummary.aiUsage,
  };
  const displayRole =
    activeProfile.affiliationType === 'student'
      ? '学生用户'
      : activeProfile.affiliationType ?? meSummary.role;
  const campusLabel = [activeProfile.college, activeProfile.major, activeProfile.gradeYear]
    .filter(Boolean)
    .join(' · ');
  const allTags = activeProfile.interestTags.length ? activeProfile.interestTags : meSummary.interests;
  const visibleTags = allTags.slice(0, 4);
  const hiddenTagCount = Math.max(allTags.length - visibleTags.length, 0);
  const visibleHighlights = (highlights?.length ? highlights : getFallbackHighlights(allTags.length)).slice(0, 3);
  const profileSummary = compactReadingSummary(activeProfile.readingProfileSummary);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
      }}>
      <View
        style={{
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radii.lg,
              height: 60,
              justifyContent: 'center',
              width: 60,
            }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.bold,
                fontSize: 22,
              }}>
              {(activeProfile.displayName || '读').trim().charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 24,
              }}>
              {activeProfile.displayName}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
              }}>
              {displayRole}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 13,
              }}>
              {campusLabel || meSummary.campus}
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.backgroundStrong,
            borderRadius: theme.radii.lg,
            flexDirection: 'row',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
          }}>
          {visibleHighlights.map((item, index) => (
            <View
              key={item.label}
              style={{
                borderRightColor: index < visibleHighlights.length - 1 ? theme.colors.borderSoft : 'transparent',
                borderRightWidth: index < visibleHighlights.length - 1 ? 1 : 0,
                flex: 1,
                gap: 4,
                paddingRight: index < visibleHighlights.length - 1 ? theme.spacing.md : 0,
              }}>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                {item.label}
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 16,
                  lineHeight: 20,
                }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            阅读偏好
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 16,
              lineHeight: 24,
            }}>
            {profileSummary}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {visibleTags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.md,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.semiBold,
                    fontSize: 12,
                  }}>
                  {tag}
                </Text>
              </View>
            ))}
            {hiddenTagCount > 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.md,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}>
                <Text
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.semiBold,
                    fontSize: 12,
                  }}>
                  +{hiddenTagCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {[meSummary.streak, meSummary.aiUsage].map((item, index) => (
            <View
              key={item}
              style={{
                backgroundColor: index === 0 ? theme.colors.warningSoft : theme.colors.backgroundStrong,
                borderRadius: theme.radii.md,
                flex: 1,
                padding: theme.spacing.md,
              }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                {compactBadgeText(item)}
              </Text>
            </View>
          ))}
        </View>

        <PillButton icon="profile" label="打开个人中心" onPress={onProfilePress} variant="accent" />
      </View>
    </View>
  );
}
