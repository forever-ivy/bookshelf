import { Link, type Href } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { useAppTheme } from '@/hooks/use-app-theme';

type PillButtonProps = {
  icon?: AppIconName;
  href?: Href;
  label: string;
  onPress?: () => void;
  testID?: string;
  variant?: 'accent' | 'glass' | 'soft';
};

export function PillButton({
  href,
  icon,
  label,
  onPress,
  testID,
  variant = 'soft',
}: PillButtonProps) {
  const { theme } = useAppTheme();
  const palette =
    variant === 'accent'
      ? {
          backgroundColor: theme.colors.primarySoft,
          borderColor: theme.colors.primaryStrong,
          color: theme.colors.primaryStrong,
        }
      : {
          backgroundColor: variant === 'glass' ? theme.colors.surfaceTint : theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          color: theme.colors.text,
        };
  const content = (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        minHeight: 40,
        paddingHorizontal: 14,
      }}>
      {icon ? <AppIcon color={palette.color} name={icon} size={16} /> : null}
      <Text
        style={{
          color: palette.color,
          ...theme.typography.semiBold,
          fontSize: 14,
        }}>
        {label}
      </Text>
    </View>
  );

  const button = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}>
      <View
        style={{
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderRadius: theme.radii.md,
          borderWidth: 1,
        }}>
        {content}
      </View>
    </Pressable>
  );

  if (!href) {
    return button;
  }

  return (
    <Link asChild href={href}>
      {button}
    </Link>
  );
}
