import React from 'react';
import { Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type StateCardVariant = 'neutral' | 'error' | 'success' | 'warning';

type StateCardProps = {
  action?: React.ReactNode;
  description: string;
  icon?: AppIconName;
  title: string;
  variant?: StateCardVariant;
};

export function StateCard({
  action,
  description,
  icon = 'info',
  title,
  variant = 'neutral',
}: StateCardProps) {
  const { theme } = useBookleafTheme();
  const palette = theme.states[variant];

  return (
    <View
      style={{
        backgroundColor: palette.background,
        borderCurve: 'continuous',
        borderRadius: theme.radii.lg,
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
              ...theme.typography.semiBold,
              fontSize: 15,
            }}>
            {title}
          </Text>
          <Text
            selectable
            style={{
              color: palette.description,
              ...theme.typography.body,
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
