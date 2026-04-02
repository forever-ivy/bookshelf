import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type SearchFilterStripProps<T extends string> = {
  activeFilter: T;
  filters: Array<{ key: T; label: string }>;
  primaryFilterKey?: T;
  onPress: (filter: T) => void;
};

export function SearchFilterStrip<T extends string>({
  activeFilter,
  filters,
  onPress,
  primaryFilterKey,
}: SearchFilterStripProps<T>) {
  const { theme } = useAppTheme();
  const filterPalettes = [
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.accentLavender, color: theme.colors.knowledgeStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
  ] as const;

  return (
    <ScrollView
      contentContainerStyle={{
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingRight: theme.spacing.xs,
      }}
      directionalLockEnabled
      horizontal
      nestedScrollEnabled
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      testID="search-filter-strip">
      {filters.map((filter, index) => {
        const palette = filterPalettes[index % filterPalettes.length];
        const isPrimaryChip = primaryFilterKey === filter.key;
        const isActive = activeFilter === filter.key;

        return (
          <Pressable
            key={filter.label}
            accessibilityRole="button"
            onPress={() => onPress(filter.key)}
            style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
            testID={`search-filter-chip-${filter.key}`}>
            <View
              style={{
                backgroundColor: isActive ? theme.colors.primarySoft : 'transparent',
                borderRadius: theme.radii.md + 2,
                padding: isActive ? 2 : 0,
              }}
              testID={`search-filter-chip-${filter.key}-shell`}>
              <View
                style={{
                  backgroundColor:
                    isPrimaryChip || isActive ? theme.colors.successSoft : palette.backgroundColor,
                  borderColor: isActive ? theme.colors.primaryStrong : theme.colors.borderStrong,
                  borderRadius: theme.radii.md,
                  borderWidth: isActive ? 1.5 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
                testID={`search-filter-chip-${filter.key}-surface`}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.medium,
                    fontSize: 13,
                  }}
                  testID={`search-filter-chip-${filter.key}-label`}>
                  {filter.label}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
