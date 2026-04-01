import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useAppTheme } from '@/hooks/use-app-theme';
import { useNotificationsQuery } from '@/hooks/use-library-app-data';

export function ToolbarProfileAction({
  onPress,
  testID,
}: {
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useAppTheme();
  const notificationsQuery = useNotificationsQuery();
  const notificationCount = notificationsQuery.data?.length ?? 0;
  const badgeLabel = notificationCount > 99 ? '99+' : String(notificationCount);

  return (
    <Pressable
      accessibilityLabel="打开个人中心"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        height: 44,
        justifyContent: 'center',
        opacity: pressed ? 0.72 : 1,
        width: 44,
      })}
      testID={testID}>
      <View
        style={{
          alignItems: 'center',
          height: 44,
          justifyContent: 'center',
          position: 'relative',
          width: 44,
        }}>
        <Image
          source="sf:person.crop.circle"
          style={{
            height: 34,
            width: 34,
          }}
          testID="toolbar-profile-action-icon"
          tintColor={theme.colors.systemBlue}
        />
        {notificationCount > 0 ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#FF3B30',
              borderRadius: 10,
              justifyContent: 'center',
              minWidth: 20,
              paddingHorizontal: 5,
              position: 'absolute',
              right: 2,
              top: 0,
            }}
            testID="toolbar-profile-action-badge">
            <Text
              selectable
              style={{
                color: theme.colors.surface,
                ...theme.typography.semiBold,
                fontSize: 11,
                fontVariant: ['tabular-nums'],
                lineHeight: 15,
              }}
              testID="toolbar-profile-action-badge-label">
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
