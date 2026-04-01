import React from 'react';
import { Text, View } from 'react-native';

import { BookCover } from '@/components/base/book-cover';
import { SectionTitle } from '@/components/base/section-title';
import { homeShelves } from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

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
                    justifyContent: 'center',
                  }}>
                  <BookCover
                    borderRadius={theme.radii.lg}
                    height={104}
                    seed={item.title}
                    tone={item.coverTone}
                    width={82}
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
