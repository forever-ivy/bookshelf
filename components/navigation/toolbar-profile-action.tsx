import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';

import { useAppTheme } from '@/hooks/use-app-theme';

export function ToolbarProfileAction({
  onPress,
  testID,
}: {
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useAppTheme();

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
      </View>
    </Pressable>
  );
}
