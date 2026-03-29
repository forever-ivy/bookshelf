import React from 'react';
import { Text, View } from 'react-native';

import { AchievementStrip } from '@/components/profile/achievement-strip';
import { InterestTagCloud } from '@/components/profile/interest-tag-cloud';
import { ReadingProfileHero } from '@/components/profile/reading-profile-hero';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { SectionTitle } from '@/components/base/section-title';
import { useAppSession } from '@/hooks/use-app-session';
import { useAchievementsQuery } from '@/hooks/use-library-app-data';
import { achievementStrip, interestTags, profilePortrait } from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function ProfileRoute() {
  const achievementsQuery = useAchievementsQuery();
  const { profile } = useAppSession();
  const { theme } = useAppTheme();
  const dynamicAchievementStrip = achievementsQuery.data
    ? [
        { label: '累计借阅', value: `${achievementsQuery.data.summary.totalBorrowedBooks} 本` },
        { label: 'AI 总结', value: `${achievementsQuery.data.summary.aiAssists} 次` },
        { label: '本月学习', value: `${achievementsQuery.data.summary.readingDays} 天` },
        { label: '当前积分', value: `${achievementsQuery.data.currentPoints}` },
      ]
    : achievementStrip;
  const dynamicSignals = [
    profile?.readingProfileSummary || profilePortrait.learningSignals[0],
    `兴趣标签：${(profile?.interestTags ?? interestTags).join('、')}`,
    `当前身份：${profile?.affiliationType ?? '学生用户'}`,
  ];
  const dynamicRhythm = [
    achievementsQuery.data
      ? `累计完成 ${achievementsQuery.data.summary.completedOrders} 次借阅`
      : profilePortrait.rhythm[0],
    achievementsQuery.data
      ? `AI 辅助 ${achievementsQuery.data.summary.aiAssists} 次`
      : profilePortrait.rhythm[1],
    achievementsQuery.data?.streakLabel ?? profilePortrait.rhythm[2],
  ];

  return (
    <ProtectedRoute>
      <PageShell headerTitle="阅读画像" mode="workspace" showBackButton>
        <ReadingProfileHero
          headline={profile ? `${profile.displayName} · 阅读与学习画像` : profilePortrait.headline}
          keywords={(profile?.interestTags?.length ? profile.interestTags : profilePortrait.keywords).slice(0, 3)}
          schedule={profile?.readingProfileSummary ?? '晚间 19:00 - 22:00 最稳定'}
        />

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="兴趣标签" />
        <InterestTagCloud tags={profile?.interestTags ?? interestTags} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="你的阅读关键词" />
        <InterestTagCloud tags={profilePortrait.keywords} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="学习偏好线索" />
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
        <AchievementStrip items={dynamicAchievementStrip} />
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
          本月阅读与学习节奏
        </Text>
        {dynamicRhythm.map((item) => (
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
