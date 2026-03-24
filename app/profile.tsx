import React from 'react';
import { Text, View } from 'react-native';

import { AchievementStrip } from '@/components/profile/achievement-strip';
import { InterestTagCloud } from '@/components/profile/interest-tag-cloud';
import { ReadingProfileHero } from '@/components/profile/reading-profile-hero';
import { PageShell } from '@/components/navigation/page-shell';
import { SectionTitle } from '@/components/base/section-title';
import { achievementStrip, interestTags, profilePortrait } from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function ProfileRoute() {
  const { theme } = useAppTheme();

  return (
    <PageShell mode="workspace">
      <ReadingProfileHero />

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle description="系统会根据这些主题更新推荐与借阅排序。" title="兴趣标签" />
        <InterestTagCloud tags={interestTags} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="你的阅读关键词" />
        <InterestTagCloud tags={profilePortrait.keywords} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle description="这些线索会决定你更适合怎样开始一轮新学习。" title="学习偏好线索" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
          }}>
          {profilePortrait.learningSignals.map((item) => (
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
        <SectionTitle description="先让成就像阅读节奏的回声，不做后台式 KPI 墙。" title="成就与积分" />
        <AchievementStrip items={achievementStrip} />
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
        {profilePortrait.rhythm.map((item) => (
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
  );
}
