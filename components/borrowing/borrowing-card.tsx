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
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.spacing.lg,
        padding: theme.spacing.lg,
      }}>
      <View
          style={{
            justifyContent: 'center',
          }}>
        <BookCover borderRadius={theme.radii.md} height={96} seed={title} tone={coverTone} width={70} />
      </View>
        <View style={{ flex: 1, gap: theme.spacing.md }}>
          <View style={{ gap: 8 }}>
            <DueStateChip state={status} />
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
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 13,
            lineHeight: 18,
          }}>
          {note}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 13,
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
  );
}
