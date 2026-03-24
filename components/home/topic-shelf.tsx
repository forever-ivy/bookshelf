import React from 'react';
import { Text, View } from 'react-native';

import { SectionTitle } from '@/components/base/section-title';
import { homeShelves } from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

function toneColor(tone: string) {
  switch (tone) {
    case 'mint':
      return '#B8E2CF';
    case 'apricot':
      return '#F4C8A8';
    case 'lavender':
      return '#D9D6FF';
    default:
      return '#DCE7FF';
  }
}

export function TopicShelf() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.xxl }}>
      {homeShelves.map((shelf) => (
        <View key={shelf.title} style={{ gap: theme.spacing.lg }}>
          <SectionTitle title={shelf.title} />
          <View style={{ gap: theme.spacing.lg }}>
            {shelf.items.map((item) => (
              <View
                key={item.title}
                style={{
                  backgroundColor: theme.colors.surfaceTask,
                  borderColor: theme.colors.borderSoft,
                  borderRadius: theme.radii.xl,
                  borderWidth: 1,
                  boxShadow: theme.shadows.card,
                  flexDirection: 'row',
                  gap: theme.spacing.lg,
                  padding: theme.spacing.lg,
                }}>
                <View
                  style={{
                    backgroundColor: toneColor(item.coverTone),
                    borderRadius: theme.radii.lg,
                    height: 104,
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                    padding: 12,
                    width: 82,
                  }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.68)',
                      borderRadius: theme.radii.sm,
                      height: 8,
                      width: '78%',
                    }}
                  />
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderRadius: theme.radii.sm,
                      height: 26,
                      width: 24,
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: theme.spacing.sm, justifyContent: 'center' }}>
                  <Text
                    style={{
                      color: theme.colors.primaryStrong,
                      ...theme.typography.medium,
                      fontSize: 12,
                    }}>
                    {item.kicker}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.heading,
                      fontSize: 20,
                      lineHeight: 24,
                    }}>
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 13,
                      lineHeight: 18,
                    }}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
