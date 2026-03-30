import React from 'react';
import { Text, View } from 'react-native';
import type { Href } from 'expo-router';

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

function coverColor(tone: BorrowingCardProps['coverTone']) {
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
            backgroundColor: coverColor(coverTone),
            borderRadius: theme.radii.md,
            height: 96,
            justifyContent: 'space-between',
            padding: 12,
            width: 70,
          }}>
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.72)',
            borderRadius: theme.radii.sm,
            height: 8,
            width: '78%',
          }}
        />
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.82)',
            borderRadius: theme.radii.sm,
            height: 28,
            width: 24,
          }}
        />
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
