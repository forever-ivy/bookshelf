import React from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { BookCover } from '@/components/base/book-cover';
import { useAppTheme } from '@/hooks/use-app-theme';

type FavoritesPreviewItem = {
  author: string;
  coverTone: 'apricot' | 'blue' | 'coral' | 'lavender' | 'mint';
  href?: Href;
  id: string;
  onPress?: () => void;
  summary?: string | null;
  title: string;
};

type FavoritesPreviewCardProps = {
  items: FavoritesPreviewItem[];
  onMorePress?: () => void;
};

function resolveSummary(summary?: string | null, title?: string) {
  const normalizedSummary = summary?.trim();

  if (normalizedSummary && normalizedSummary !== title?.trim()) {
    return normalizedSummary;
  }

  return '暂无摘要';
}

export function FavoritesPreviewCard({ items, onMorePress }: FavoritesPreviewCardProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 28,
        boxShadow: theme.shadows.card,
        overflow: 'hidden',
      }}
      testID="favorites-preview-card">
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: theme.colors.borderSoft,
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 20,
            letterSpacing: -0.2,
          }}>
          收藏图书
        </Text>
        {onMorePress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onMorePress}
            style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
            testID="favorites-tab-more">
            <Text
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              更多
            </Text>
          </Pressable>
        ) : null}
      </View>

      {items.map((item, index) => {
        const row = (
          <Pressable
            accessibilityRole={item.href ? 'link' : 'button'}
            onPress={item.onPress}
            style={({ pressed }) => ({
              opacity: pressed ? 0.94 : 1,
            })}
            testID={`favorites-preview-row-${item.id}`}>
            <View
              style={{
                alignItems: 'center',
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                flexDirection: 'row',
                gap: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
              }}>
              <BookCover
                borderRadius={theme.radii.md}
                height={74}
                seed={item.title}
                tone={item.coverTone}
                width={54}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                    lineHeight: 22,
                  }}>
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 19,
                  }}>
                  {item.author}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 19,
                  }}>
                  {resolveSummary(item.summary, item.title)}
                </Text>
              </View>
              <AppIcon color={theme.colors.textMuted} name="chevronRight" size={16} strokeWidth={2} />
            </View>
          </Pressable>
        );

        if (item.href) {
          return (
            <Link asChild href={item.href} key={item.id}>
              {row}
            </Link>
          );
        }

        return <React.Fragment key={item.id}>{row}</React.Fragment>;
      })}
    </View>
  );
}
