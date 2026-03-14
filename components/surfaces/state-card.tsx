import React from 'react';
import { Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { bookleafTheme } from '@/constants/bookleaf-theme';

type StateCardVariant = 'neutral' | 'error' | 'success' | 'warning';

type StateCardProps = {
  action?: React.ReactNode;
  description: string;
  icon?: AppIconName;
  title: string;
  variant?: StateCardVariant;
};

const paletteByVariant: Record<StateCardVariant, { background: string; icon: string; title: string }> = {
  error: {
    background: '#FEE2E2',
    icon: '#991B1B',
    title: '#7F1D1D',
  },
  neutral: {
    background: 'rgba(240,244,239,0.92)',
    icon: bookleafTheme.colors.textMuted,
    title: bookleafTheme.colors.text,
  },
  success: {
    background: '#DCFCE7',
    icon: '#166534',
    title: '#14532D',
  },
  warning: {
    background: '#FEF3C7',
    icon: '#92400E',
    title: '#78350F',
  },
};

export function StateCard({
  action,
  description,
  icon = 'info',
  title,
  variant = 'neutral',
}: StateCardProps) {
  const palette = paletteByVariant[variant];

  return (
    <View
      style={{
        backgroundColor: palette.background,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.lg,
        gap: 12,
        padding: 16,
      }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 2,
          }}>
          <AppIcon color={palette.icon} name={icon} size={18} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            selectable
            style={{
              color: palette.title,
              ...bookleafTheme.typography.semiBold,
              fontSize: 15,
            }}>
            {title}
          </Text>
          <Text
            selectable
            style={{
              color: variant === 'neutral' ? bookleafTheme.colors.textMuted : palette.title,
              ...bookleafTheme.typography.body,
              fontSize: 13,
              lineHeight: 18,
            }}>
            {description}
          </Text>
        </View>
      </View>
      {action}
    </View>
  );
}
