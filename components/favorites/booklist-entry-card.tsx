import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { useAppTheme } from '@/hooks/use-app-theme';

type BooklistEntryCardProps = {
  bookCount: number;
  description?: string | null;
  onPress?: () => void;
  testID?: string;
  title: string;
  variant?: 'embedded' | 'standalone';
};

function resolveBookCountLabel(bookCount: number) {
  return `${bookCount} 本图书`;
}

export function BooklistEntryCard({
  bookCount,
  description,
  onPress,
  testID,
  title,
  variant = 'standalone',
}: BooklistEntryCardProps) {
  const { theme } = useAppTheme();
  const embedded = variant === 'embedded';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.94 : 1,
        transform: [{ scale: pressed ? (embedded ? 0.996 : 0.992) : 1 }],
      })}
      testID={testID ?? 'booklist-entry-card'}>
      <View
        style={{
          backgroundColor: embedded ? 'transparent' : theme.colors.surface,
          borderColor: embedded ? 'transparent' : theme.colors.borderStrong,
          borderRadius: embedded ? 0 : theme.radii.xl,
          borderWidth: embedded ? 0 : 1,
          gap: embedded ? theme.spacing.sm : theme.spacing.md,
          padding: embedded ? 0 : theme.spacing.lg,
        }}>
        <View
          style={{
            alignItems: 'flex-start',
            gap: 8,
          }}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: embedded ? 16 : 18,
              lineHeight: embedded ? 22 : 24,
            }}>
            {title}
          </Text>
          <Text
            numberOfLines={embedded ? 2 : 3}
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: embedded ? 13 : 14,
              lineHeight: embedded ? 19 : 21,
            }}>
            {description?.trim() || '打开这份书单，看看你已经整理好的主题阅读。'}
          </Text>
        </View>

        <View
          style={{
            alignItems: 'center',
            borderTopColor: embedded ? 'transparent' : theme.colors.borderSoft,
            borderTopWidth: embedded ? 0 : 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: embedded ? 0 : theme.spacing.md,
          }}>
          <View
            style={{
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radii.pill,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}>
            <Text
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              {resolveBookCountLabel(bookCount)}
            </Text>
          </View>

          <AppIcon color={theme.colors.primaryStrong} name="chevronRight" size={18} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}
