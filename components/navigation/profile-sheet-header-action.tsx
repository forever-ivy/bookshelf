import React from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

import { ProfileSheetTriggerButton } from '@/components/navigation/profile-sheet-trigger-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useProfileSheet } from '@/providers/profile-sheet-provider';

export function useProfileSheetHeaderOptions(): Pick<
  NativeStackNavigationOptions,
  'headerRight' | 'unstable_headerRightItems'
> {
  const { theme } = useAppTheme();
  const { openProfileSheet } = useProfileSheet();

  return React.useMemo(() => {
    if (Platform.OS === 'ios') {
      return {
        unstable_headerRightItems: () => [
          {
            icon: {
              name: 'person.crop.circle',
              type: 'sfSymbol',
            },
            label: '个人中心',
            onPress: openProfileSheet,
            tintColor: theme.colors.text,
            type: 'button' as const,
            variant: 'plain' as const,
          },
        ],
      };
    }

    return {
      headerRight: () => <ProfileSheetTriggerButton onPress={openProfileSheet} />,
    };
  }, [openProfileSheet, theme.colors.text]);
}

export function ProfileSheetHeaderAction() {
  const { openProfileSheet } = useProfileSheet();

  return <ProfileSheetTriggerButton onPress={openProfileSheet} />;
}
