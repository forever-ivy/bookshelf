import React from 'react';
import { Text, View } from 'react-native';

import { AchievementStrip } from '@/components/profile/achievement-strip';
import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
} from '@/components/base/loading-skeleton';
import { InterestTagCloud } from '@/components/profile/interest-tag-cloud';
import { ReadingProfileHero } from '@/components/profile/reading-profile-hero';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { SectionTitle } from '@/components/base/section-title';
import { useAppSession } from '@/hooks/use-app-session';
import { useAchievementsQuery } from '@/hooks/use-library-app-data';
import { achievementStrip, interestTags, profilePortrait } from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

function AchievementStripSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }} testID="profile-achievement-skeleton">
      {Array.from({ length: 4 }, (_, index) => (
        <LoadingSkeletonCard
          key={`profile-achievement-skeleton-${index}`}
          style={{
            flexGrow: 1,
            gap: 8,
            minWidth: 140,
            width: '47%',
          }}>
          <LoadingSkeletonBlock height={22} width="54%" />
          <LoadingSkeletonBlock height={12} width="42%" />
        </LoadingSkeletonCard>
      ))}
    </View>
  );
}

export default function ProfileRoute() {
  const achievementsQuery = useAchievementsQuery();
  const { profile } = useAppSession();
  const { theme } = useAppTheme();
  const dynamicAchievementStrip = achievementsQuery.data
    ? [
        { label: '累计借阅', value: `${achievementsQuery.data.summary.totalBorrowedBooks} 本` },
        { label: '借阅辅助', value: `${achievementsQuery.data.summary.aiAssists} 次` },
        { label: '本月阅读', value: `${achievementsQuery.data.summary.readingDays} 天` },
        { label: '当前积分', value: `${achievementsQuery.data.currentPoints}` },
      ]
    : achievementStrip;
  const dynamicSignals = [
    profile?.readingProfileSummary || '你更适合先看结构清晰、容易快速进入状态的书。',
    `常借主题：${(profile?.interestTags ?? interestTags).join('、')}`,
    `读者身份：${profile?.affiliationType === 'student' ? '学生用户' : profile?.affiliationType ?? '学生用户'}`,
  ];
  const dynamicRhythm = [
    achievementsQuery.data ? `累计完成 ${achievementsQuery.data.summary.completedOrders} 次借阅` : profilePortrait.rhythm[0],
    achievementsQuery.data ? `本月阅读 ${achievementsQuery.data.summary.readingDays} 天` : profilePortrait.rhythm[1],
    achievementsQuery.data?.streakLabel ?? profilePortrait.rhythm[2],
  ];
  const showAchievementSkeleton = !achievementsQuery.data && Boolean(achievementsQuery.isFetching);

  return (
    <ProtectedRoute>
      <PageShell mode="workspace">
        <ReadingProfileHero
          headline={profile ? `${profile.displayName} · 借阅偏好` : '借阅偏好'}
          keywords={(profile?.interestTags?.length ? profile.interestTags : profilePortrait.keywords).slice(0, 3)}
          schedule={profile?.readingProfileSummary ?? '晚间 19:00 - 22:00 最稳定'}
        />

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="借阅偏好" />
        <InterestTagCloud tags={profile?.interestTags ?? interestTags} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="常借主题" />
        <InterestTagCloud tags={profilePortrait.keywords} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="阅读习惯" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
          }}>
          {dynamicSignals.map((item) => (
            <View
              key={item}
              style={{
                flexDirection: 'row',
                gap: theme.spacing.md,
              }}>
              <View
                style={{
                  backgroundColor: theme.colors.primaryStrong,
                  borderRadius: theme.radii.pill,
                  height: 8,
                  marginTop: 6,
                  width: 8,
                }}
              />
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.medium,
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="成就与积分" />
        {showAchievementSkeleton ? <AchievementStripSkeleton /> : <AchievementStrip items={dynamicAchievementStrip} />}
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.md,
          padding: theme.spacing.xl,
        }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 24,
          }}>
          近期借阅节奏
        </Text>
        {showAchievementSkeleton
          ? Array.from({ length: 3 }, (_, index) => (
              <LoadingSkeletonBlock
                key={`profile-rhythm-skeleton-${index}`}
                height={14}
                width={index === 2 ? '42%' : '58%'}
              />
            ))
          : dynamicRhythm.map((item) => (
              <Text
                key={item}
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                • {item}
              </Text>
            ))}
      </View>
      </PageShell>
    </ProtectedRoute>
  );
}
