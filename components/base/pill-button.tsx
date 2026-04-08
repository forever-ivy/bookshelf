import { Link, type Href } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { useAppTheme } from '@/hooks/use-app-theme';

type PillButtonProps = {
  fullWidth?: boolean;
  fullHeight?: boolean;
  icon?: AppIconName;
  href?: Href;
  label: string;
  onPress?: () => void;
  size?: 'default' | 'hero';
  surfaceTestID?: string;
  testID?: string;
  variant?: 'accent' | 'glass' | 'prominent' | 'soft';
};

export function PillButton({
  fullWidth = false,
  fullHeight = false,
  href,
  icon,
  label,
  onPress,
  size = 'default',
  surfaceTestID,
  testID,
  variant = 'soft',
}: PillButtonProps) {
  const { theme } = useAppTheme();
  const palette =
    variant === 'prominent'
      ? {
          backgroundColor: theme.colors.primaryStrong,
          borderColor: theme.colors.primaryStrong,
          boxShadow: theme.shadows.float,
          color: theme.colors.surface,
        }
      : variant === 'accent'
        ? {
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.primaryStrong,
            boxShadow: undefined,
            color: theme.colors.primaryStrong,
          }
        : {
            backgroundColor: variant === 'glass' ? theme.colors.surfaceTint : theme.colors.surface,
            borderColor: variant === 'glass' ? theme.colors.borderSoft : theme.colors.borderStrong,
            boxShadow: undefined,
            color: theme.colors.text,
          };
  const content = (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        minHeight: size === 'hero' ? 52 : 40,
        paddingHorizontal: 14,
      }}>
      {icon ? <AppIcon color={palette.color} name={icon} size={16} /> : null}
      <Text
        style={{
          color: palette.color,
          ...theme.typography.semiBold,
          fontSize: size === 'hero' ? 15 : 14,
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
        height: fullHeight ? '100%' : undefined,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        width: fullWidth ? '100%' : undefined,
      })}>
      <View
        testID={surfaceTestID}
        style={{
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          boxShadow: palette.boxShadow,
          height: fullHeight ? '100%' : undefined,
          width: fullWidth ? '100%' : undefined,
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
