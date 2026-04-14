import React from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Pressable, Platform } from 'react-native';
import { EllipsisVertical } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function TutorWorkspaceHeaderMenuButton({
  label = '打开更多操作',
  onPress,
  testID = 'tutor-workspace-header-menu-button',
}: {
  label?: string;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useAppTheme();
  const MenuIcon = EllipsisVertical as React.ComponentType<any>;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderRadius: theme.radii.pill,
        height: 44,
        justifyContent: 'center',
        marginRight: -8,
        opacity: pressed ? 0.82 : 1,
        width: 44,
      })}>
      <MenuIcon color={theme.colors.text} size={20} strokeWidth={2} />
    </Pressable>
  );
}

export function useTutorWorkspaceHeaderMenuOptions({
  label = '打开更多操作',
  onPress,
  testID,
}: {
  label?: string;
  onPress: () => void;
  testID?: string;
}): Pick<NativeStackNavigationOptions, 'headerRight' | 'unstable_headerRightItems'> {
  const { theme } = useAppTheme();

  return React.useMemo(() => {
    if (Platform.OS === 'ios') {
      return {
        unstable_headerRightItems: () => [
          {
            icon: {
              name: 'ellipsis.circle',
              type: 'sfSymbol',
            },
            label,
            onPress,
            tintColor: theme.colors.text,
            type: 'button' as const,
            variant: 'plain' as const,
          },
        ],
      };
    }

    return {
      headerRight: () => (
        <TutorWorkspaceHeaderMenuButton
          label={label}
          onPress={onPress}
          testID={testID}
        />
      ),
    };
  }, [label, onPress, testID, theme.colors.text]);
}
