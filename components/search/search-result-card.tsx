import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';

type SearchResultCardProps = {
  availability: string;
  author: string;
  coverTone: 'apricot' | 'blue' | 'coral' | 'lavender' | 'mint';
  eta: string;
  location: string;
  title: string;
};

function coverColor(tone: SearchResultCardProps['coverTone']) {
  switch (tone) {
    case 'mint':
      return '#B8E2CF';
    case 'apricot':
      return '#F4C8A8';
    case 'lavender':
      return '#D9D6FF';
    case 'coral':
      return '#F6D0C9';
    default:
      return '#DCE7FF';
  }
}

export function SearchResultCard({
  availability,
  author,
  coverTone,
  eta,
  location,
  title,
}: SearchResultCardProps) {
  const { theme } = useAppTheme();
  const availabilityPalette =
    availability.includes('可立即借阅')
      ? { backgroundColor: theme.colors.successSoft, color: theme.colors.success }
      : availability.includes('自取')
        ? { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong }
        : { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning };

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
      }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <View
          style={{
            backgroundColor: coverColor(coverTone),
            borderRadius: theme.radii.md,
            height: 92,
            justifyContent: 'space-between',
            padding: 10,
            width: 68,
          }}>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.68)',
              borderRadius: theme.radii.sm,
              height: 8,
              width: '74%',
            }}
          />
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.82)',
              borderRadius: theme.radii.sm,
              height: 24,
              width: 22,
            }}
          />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: availabilityPalette.backgroundColor,
              borderRadius: theme.radii.md,
              paddingHorizontal: 8,
              paddingVertical: 5,
            }}>
            <Text
              style={{
                color: availabilityPalette.color,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              {availability}
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 18,
              lineHeight: 22,
            }}>
            {title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 13,
            }}>
            {author}
          </Text>
        </View>
      </View>

      <View
        style={{
          borderTopColor: theme.colors.borderSoft,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: theme.spacing.md,
          justifyContent: 'space-between',
          paddingTop: theme.spacing.md,
        }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            履约方式
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {eta}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            所在位置
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {location}
          </Text>
        </View>
      </View>

      <PillButton label="查看详情并借阅" variant="accent" />
    </View>
  );
}
