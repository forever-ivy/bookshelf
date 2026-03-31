import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { MarkerHighlightText } from '@/components/base/marker-highlight-text';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SoftSearchBar({
  inputTestID,
  onChangeText,
  placeholder = '搜索书名、作者、更多信息',
  testID,
  value,
  mode = 'teaser',
  onPress,
}: {
  inputTestID?: string;
  onChangeText?: (value: string) => void;
  mode?: 'full' | 'teaser';
  onPress?: () => void;
  placeholder?: string;
  testID?: string;
  value?: string;
}) {
  const { theme } = useAppTheme();
  const isFull = mode === 'full';
  const contentMinHeight = isFull ? 52 : 48;

  const content = (
    <View
      testID={testID}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
      }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: contentMinHeight,
          paddingHorizontal: 16,
        }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.iconSurface,
            borderRadius: theme.radii.md,
            height: 28,
            justifyContent: 'center',
            width: 28,
          }}>
          <AppIcon color={theme.colors.iconInk} name="search" size={14} strokeWidth={1.68} />
        </View>
        <View style={{ flex: 1 }}>
          {onChangeText ? (
            <TextInput
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textSoft}
              testID={inputTestID}
              value={value}
              style={{
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 14,
                paddingVertical: 0,
              }}
            />
          ) : (
            <MarkerHighlightText
              highlight="更多信息"
              text={placeholder}
              textStyle={{
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 14,
              }}
            />
          )}
        </View>
        <AppIcon color={theme.colors.textSoft} name="chevronRight" size={16} strokeWidth={1.7} />
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} testID={testID}>
      {content}
    </Pressable>
  );
}
