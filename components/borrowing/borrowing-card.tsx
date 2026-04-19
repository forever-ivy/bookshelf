import React from 'react';
import { Text, View } from 'react-native';
import type { Href } from 'expo-router';

import { BookCover } from '@/components/base/book-cover';
import { PillButton } from '@/components/base/pill-button';
import { DueStateChip } from '@/components/borrowing/due-state-chip';
import { useAppTheme } from '@/hooks/use-app-theme';

type BorrowingCardProps = {
  actionLabel: string;
  author: string;
  coverTone: 'apricot' | 'blue' | 'coral' | 'lavender' | 'mint';
  dueDate: string;
  href?: Href;
  note: string;
  onPress?: () => void;
  status: 'active' | 'cancelled' | 'completed' | 'dueSoon' | 'overdue' | 'renewable';
  title: string;
};

export function BorrowingCard({
  actionLabel,
  author,
  coverTone,
  dueDate,
  href,
  note,
  onPress,
  status,
  title,
}: BorrowingCardProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 28,
        boxShadow: theme.shadows.card,
        flexDirection: 'row',
        gap: 20,
        overflow: 'hidden',
        padding: 16,
      }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: 20,
          justifyContent: 'center',
          width: 128,
          alignSelf: 'stretch',
        }}>
        <BookCover borderRadius={theme.radii.md} height={132} seed={title} tone={coverTone} width={96} />
      </View>
      <View style={{ flex: 1, paddingVertical: 4 }}>
        <View style={{ gap: 4, marginBottom: 'auto' }}>
          <View style={{ alignItems: 'flex-start', marginBottom: 2 }}>
            <DueStateChip state={status} />
          </View>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              ...theme.typography.bold,
              fontSize: 18,
              lineHeight: 24,
              letterSpacing: -0.3,
            }}>
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.medium,
              fontSize: 13,
            }}>
            {author}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 13,
              marginTop: 4,
            }}>
            {note}
          </Text>
        </View>

        <View style={{ gap: 12, marginTop: 16 }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            到期时间 · {dueDate}
          </Text>
          <PillButton
            href={href}
            label={actionLabel}
            onPress={onPress}
            variant={status === 'active' ? 'soft' : 'accent'}
          />
        </View>
      </View>
    </View>
  );
}
