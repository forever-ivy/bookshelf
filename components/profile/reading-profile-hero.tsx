import React from 'react';
import { Text, View } from 'react-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';
import { profilePortrait } from '@/lib/app/mock-data';

export function ReadingProfileHero() {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
      }}>
      <View style={{ gap: theme.spacing.lg, padding: theme.spacing.xl }}>
        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 11,
              letterSpacing: 0.2,
              textTransform: 'uppercase',
            }}>
            Report
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 30,
              letterSpacing: -0.6,
              lineHeight: 36,
            }}>
            {profilePortrait.headline}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 20,
            }}>
            {profilePortrait.subtitle}
          </Text>
        </View>
        <EditorialIllustration
          height={168}
          inset={false}
          source={appArtwork.notionInterestSelection}
          testID="profile-artwork"
        />
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
              阅读关键词
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 14,
                lineHeight: 20,
              }}>
              {profilePortrait.keywords.slice(0, 2).join(' · ')}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              学习节奏
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 14,
                lineHeight: 20,
              }}>
              晚间 19:00 - 22:00 最稳定
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
