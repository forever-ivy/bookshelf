import { ArrowUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { GlassSurface } from '@/components/base/glass-surface';
import { useAppTheme } from '@/hooks/use-app-theme';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const ArrowUpIcon = ArrowUp as IconComponent;

export function LearningComposer({
  disabled,
  draft,
  inputTestID,
  onChangeText,
  onPrimaryActionPress,
  onSend,
  onSuggestionPress,
  placeholder,
  primaryActionLabel,
  sendButtonTestID,
  statusLabel,
  suggestions,
}: {
  disabled?: boolean;
  draft: string;
  inputTestID?: string;
  onChangeText: (value: string) => void;
  onPrimaryActionPress?: () => void;
  onSend: () => void;
  onSuggestionPress?: (value: string) => void;
  placeholder: string;
  primaryActionLabel?: string;
  sendButtonTestID?: string;
  statusLabel?: string | null;
  suggestions?: string[];
}) {
  const { theme } = useAppTheme();
  const hasDraft = draft.trim().length > 0;

  return (
    <View style={{ gap: 10 }}>
      {statusLabel ? (
        <Text
          selectable
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.medium,
            fontSize: 12,
          }}>
          {statusLabel}
        </Text>
      ) : null}

      {primaryActionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPrimaryActionPress}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            opacity: pressed ? 0.76 : 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
          })}>
          <Text
            selectable
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.medium,
              fontSize: 13,
            }}>
            {primaryActionLabel}
          </Text>
        </Pressable>
      ) : null}

      {suggestions && suggestions.length > 0 ? (
        <ScrollView
          horizontal
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          showsHorizontalScrollIndicator={false}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              onPress={() => onSuggestionPress?.(suggestion)}
              style={({ pressed }) => ({
                backgroundColor: theme.colors.surfaceTint,
                borderColor: theme.colors.borderSoft,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                opacity: pressed ? 0.76 : 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
              })}>
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                }}>
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <GlassSurface
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 28,
          padding: 6,
        }}>
        <View
          style={{
            alignItems: 'flex-end',
            flexDirection: 'row',
            gap: 10,
            minHeight: 60,
            paddingLeft: 12,
          }}>
          <TextInput
            multiline
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSoft}
            testID={inputTestID}
            style={{
              color: theme.colors.text,
              flex: 1,
              ...theme.typography.body,
              fontSize: 15,
              lineHeight: 21,
              maxHeight: 120,
              minHeight: 48,
              paddingBottom: 12,
              paddingTop: 12,
            }}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            disabled={disabled || !hasDraft}
            onPress={onSend}
            testID={sendButtonTestID}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor:
                disabled || !hasDraft ? theme.colors.surfaceMuted : theme.colors.primaryStrong,
              borderRadius: theme.radii.pill,
              height: 46,
              justifyContent: 'center',
              marginBottom: 1,
              opacity: pressed ? 0.84 : 1,
              width: 46,
            })}>
            <ArrowUpIcon
              color={disabled || !hasDraft ? theme.colors.textSoft : theme.colors.surface}
              size={18}
            />
          </Pressable>
        </View>
      </GlassSurface>
    </View>
  );
}
