import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { meSummary } from '@/lib/app/mock-data';
import type { StudentProfile } from '@/lib/api/types';
import { useAppTheme } from '@/hooks/use-app-theme';

export function ProfileSummaryCard({
  onProfilePress,
  profile,
}: {
  onProfilePress?: () => void;
  profile?: StudentProfile | null;
}) {
  const { theme } = useAppTheme();
  const activeProfile = profile ?? {
    accountId: 1,
    affiliationType: meSummary.role,
    college: meSummary.campus,
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
    displayName: meSummary.name,
  };
  const displayRole =
    activeProfile.affiliationType === 'student'
      ? '学生用户'
      : activeProfile.affiliationType ?? meSummary.role;
  const campusLabel = [activeProfile.college, activeProfile.major, activeProfile.gradeYear]
    .filter(Boolean)
    .join(' · ');

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
          gap: theme.spacing.xl,
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {(activeProfile.interestTags.length ? activeProfile.interestTags : meSummary.interests).map((tag, index) => (
            <View
              key={tag}
              style={{
                backgroundColor:
                  index === 0
                    ? theme.colors.primarySoft
                    : index === 1
                      ? theme.colors.accentLavender
                      : theme.colors.successSoft,
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
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {[meSummary.streak, activeProfile.readingProfileSummary || meSummary.aiUsage].map((item, index) => (
            <View
              key={item}
              style={{
                backgroundColor: index === 0 ? theme.colors.warningSoft : theme.colors.primarySoft,
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
                {item}
              </Text>
            </View>
          ))}
        </View>
        <PillButton icon="profile" label="打开个人中心" onPress={onProfilePress} variant="accent" />
      </View>
    </View>
  );
}
