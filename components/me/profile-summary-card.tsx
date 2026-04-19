import React from 'react';
import { Platform, Text, View } from 'react-native';

import { GlassSurface } from '@/components/base/glass-surface';
import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { meSummary } from '@/lib/app/mock-data';
import type { StudentProfile } from '@/lib/api/types';

function getFallbackHighlights(tagCount: number) {
  return [
    { label: '借阅中', value: '6' },
    { label: '累计借阅', value: '12 本' },
    { label: '连续学习', value: '12 天' },
  ];
}

function compactReadingSummary(value: string | null | undefined) {
  if (!value) {
    return '暂未设定阅读偏好';
  }

  const normalized = value.replace(/[。！]/g, '').trim();
  return normalized.length > 24 ? `${normalized.slice(0, 24)}…` : normalized;
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
      : activeProfile.affiliationType ?? '校内用户';
  
  const campusLabel = [activeProfile.college, activeProfile.major, activeProfile.gradeYear]
    .filter(Boolean)
    .join(' · ');

  const allTags = activeProfile.interestTags.length ? activeProfile.interestTags : meSummary.interests;
  const visibleTags = allTags.slice(0, 4);
  const hiddenTagCount = Math.max(allTags.length - visibleTags.length, 0);
  const visibleHighlights = (highlights?.length ? highlights : getFallbackHighlights(allTags.length)).slice(0, 3);
  const profileSummary = compactReadingSummary(activeProfile.readingProfileSummary);

  return (
    <GlassSurface
      intensity={Platform.OS === 'ios' ? 45 : 100}
      style={{
        borderRadius: 32,
        boxShadow: theme.shadows.card,
        overflow: 'hidden',
      }}>
      <View
        style={{
          gap: 28,
          padding: 24,
        }}>
        {/* Header Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.surfaceMuted,
              borderRadius: 24,
              height: 64,
              justifyContent: 'center',
              width: 64,
            }}>
            <Text
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.bold,
                fontSize: 26,
              }}>
              {(activeProfile.displayName || '读').trim().charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 24,
              }}>
              {activeProfile.displayName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.medium,
                  fontSize: 13,
                }}>
                {displayRole}
              </Text>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.borderStrong }} />
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                  flex: 1,
                }}>
                {campusLabel || '校区设置中'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: 20,
            flexDirection: 'row',
            paddingVertical: 16,
          }}>
          {visibleHighlights.map((item, index) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRightColor: index < visibleHighlights.length - 1 ? theme.colors.borderSoft : 'transparent',
                borderRightWidth: index < visibleHighlights.length - 1 ? 1 : 0,
              }}>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                  marginBottom: 4,
                }}>
                {item.label}
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.bold,
                  fontSize: 18,
                }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Reading Preferences Section */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.semiBold,
                fontSize: 13,
              }}>
              阅读偏好
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.medium,
                fontSize: 12,
                flex: 1,
              }}>
              {activeProfile.displayName} 偏好 {profileSummary}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {visibleTags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: theme.colors.backgroundStrong,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft,
                }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {tag}
                </Text>
              </View>
            ))}
            {hiddenTagCount > 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.backgroundStrong,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
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

        {/* Badges Section */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View
            style={{
              backgroundColor: theme.colors.warningSoft,
              borderRadius: 16,
              flex: 1,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.warningStrong }} />
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              {compactBadgeText(meSummary.streak)}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: theme.colors.primarySoft,
              borderRadius: 16,
              flex: 1,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primaryStrong }} />
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              {compactBadgeText(meSummary.aiUsage)}
            </Text>
          </View>
        </View>

        {/* Footer Action */}
        <PillButton
          icon="profile"
          label="管理个人档案"
          onPress={onProfilePress}
          variant="secondary"
          style={{ marginTop: 4 }}
        />
      </View>
    </GlassSurface>
  );
}
