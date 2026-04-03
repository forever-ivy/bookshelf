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
  const sectionCardStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    padding: theme.spacing.xl,
  } as const;
  const dynamicAchievementStrip = achievementsQuery.data
    ? [
        { label: '累计借阅', value: `${achievementsQuery.data.summary.totalBorrowedBooks} 本` },
        { label: 'AI 辅助', value: `${achievementsQuery.data.summary.aiAssists} 次` },
        { label: '活跃天数', value: `${achievementsQuery.data.summary.readingDays} 天` },
        { label: '积分', value: `${achievementsQuery.data.currentPoints}` },
      ]
    : achievementStrip;
  const dynamicSignals = [
    `阅读方式：${profile?.readingProfileSummary || '先看框架，再进入重点内容。'}`,
    `常借主题：${(profile?.interestTags ?? interestTags).join('、')}`,
    `账户身份：${profile?.affiliationType === 'student' ? '学生用户' : profile?.affiliationType ?? '学生用户'}`,
  ];
  const dynamicRhythm = [
    achievementsQuery.data ? `完成 ${achievementsQuery.data.summary.completedOrders} 次借阅` : profilePortrait.rhythm[0],
    achievementsQuery.data ? `本月活跃 ${achievementsQuery.data.summary.readingDays} 天` : profilePortrait.rhythm[1],
    achievementsQuery.data?.streakLabel ?? profilePortrait.rhythm[2],
  ];
  const showAchievementSkeleton = !achievementsQuery.data && Boolean(achievementsQuery.isFetching);

  return (
    <ProtectedRoute>
      <PageShell mode="workspace" pageTitle="借阅档案">
        <ReadingProfileHero
          headline={profile?.displayName ?? '借阅档案'}
          keywords={(profile?.interestTags?.length ? profile.interestTags : profilePortrait.keywords).slice(0, 3)}
          schedule={profile?.readingProfileSummary ?? '晚间 19:00 - 22:00 最稳定'}
          summary="最近借阅、主题偏好与阅读节奏，一页查看。"
          title="借阅偏好概览"
        />

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle description="优先展示当前最相关的阅读主题。" title="关注主题" />
          <View style={sectionCardStyle}>
            <InterestTagCloud tags={profile?.interestTags ?? interestTags} />
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle description="作为推荐与找书排序的参考。" title="阅读方向" />
          <View style={sectionCardStyle}>
            <InterestTagCloud tags={profilePortrait.keywords} />
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle description="保持简洁，只保留最有用的三条信息。" title="近期节奏" />
          <View
            style={{
              gap: theme.spacing.md,
              ...sectionCardStyle,
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
          <SectionTitle description="本月关键数据集中展示。" title="本月概览" />
          {showAchievementSkeleton ? <AchievementStripSkeleton /> : <AchievementStrip items={dynamicAchievementStrip} />}
        </View>

        <View
          style={{
            gap: theme.spacing.md,
            ...sectionCardStyle,
          }}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 22,
              letterSpacing: -0.3,
            }}>
            借阅记录
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
