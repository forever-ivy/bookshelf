import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { useAppTheme } from '@/hooks/use-app-theme';

type MenuItem = {
  description: string;
  icon: AppIconName;
  title: string;
};

export function MenuList({
  items,
  onPressItem,
}: {
  items: readonly MenuItem[];
  onPressItem?: (title: string) => void;
}) {
  const { theme } = useAppTheme();
  const iconPalettes = [
    { backgroundColor: theme.colors.accentLavender, color: theme.colors.knowledgeStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
  ] as const;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        overflow: 'hidden',
      }}>
      {items.map((item, index) => (
        (() => {
          const palette = iconPalettes[index % iconPalettes.length];

          return (
        <Pressable
          key={item.title}
          accessibilityRole="button"
          onPress={() => onPressItem?.(item.title)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.colors.backgroundStrong : 'transparent',
            borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
            borderTopWidth: index === 0 ? 0 : 1,
          })}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: theme.spacing.lg,
              padding: theme.spacing.lg,
            }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: palette.backgroundColor,
                borderRadius: theme.radii.sm,
                height: 34,
                justifyContent: 'center',
                width: 34,
              }}>
              <AppIcon color={palette.color} name={item.icon} size={16} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
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
            <AppIcon color={theme.colors.textSoft} name="chevronRight" size={16} strokeWidth={1.7} />
          </View>
        </Pressable>
          );
        })()
      ))}
    </View>
  );
}
