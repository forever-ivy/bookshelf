import React from 'react';
import { Text, View } from 'react-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';
import { profilePortrait } from '@/lib/app/mock-data';

export function ReadingProfileHero({
  headline = '借阅档案',
  keywords = profilePortrait.keywords,
  schedule = '晚间稳定',
  summary = profilePortrait.subtitle,
  title = '借阅偏好',
}: {
  headline?: string;
  keywords?: readonly string[];
  schedule?: string;
  summary?: string;
  title?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
      }}>
      <View style={{ gap: theme.spacing.xl, padding: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 34,
              letterSpacing: -0.8,
              lineHeight: 40,
            }}>
            {headline}
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 17,
              lineHeight: 24,
            }}>
            {title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 22,
              maxWidth: 280,
            }}>
            {summary}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: theme.colors.backgroundStrong,
            borderRadius: theme.radii.xl,
            overflow: 'hidden',
            padding: theme.spacing.sm,
          }}>
          <EditorialIllustration
            height={168}
            inset={false}
            source={appArtwork.notionInterestSelection}
            testID="profile-artwork"
          />
        </View>
        <View
          style={{
            borderTopColor: theme.colors.borderSoft,
            borderTopWidth: 1,
            flexDirection: 'row',
            gap: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
          }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              常借主题
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 14,
                lineHeight: 20,
              }}>
              {keywords.slice(0, 2).join(' · ')}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              近期节奏
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 14,
                lineHeight: 20,
              }}>
              {schedule}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
