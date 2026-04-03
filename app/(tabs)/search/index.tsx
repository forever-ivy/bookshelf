import { Stack } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { ProfileSheetTriggerButton } from '@/components/navigation/profile-sheet-trigger-button';
import { ToolbarHeaderRow } from '@/components/navigation/toolbar-header-row';
import { ToolbarProfileAction } from '@/components/navigation/toolbar-profile-action';
import { SearchScreen, resolveSearchText } from '@/components/search/search-screen';
import { useHeaderChromeVisibility } from '@/hooks/use-header-chrome-visibility';
import { useProfileSheet } from '@/providers/profile-sheet-provider';

export default function SearchRoute() {
  const [query, setQuery] = React.useState('');
  const { openProfileSheet } = useProfileSheet();
  const { onScroll, showHeaderChrome } = useHeaderChromeVisibility();
  const isIos = Platform.OS === 'ios';
  const handleSearchTextChange = React.useCallback((value: unknown) => {
    setQuery(resolveSearchText(value));
  }, []);
  const headerSearchBarOptions = React.useMemo(
    () => ({
      onChangeText: handleSearchTextChange,
      onSearchButtonPress: handleSearchTextChange,
      placement: 'automatic' as const,
      placeholder: '搜索书名、作者、更多信息',
    }),
    [handleSearchTextChange]
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...(isIos
            ? {
                title: '',
                unstable_headerLeftItems: () =>
                  showHeaderChrome
                    ? [
                        {
                          element: (
                            <View testID="search-header-inline-title-slot">
                              <ToolbarHeaderRow title="找书" />
                            </View>
                          ),
                          hidesSharedBackground: true,
                          type: 'custom' as const,
                        },
                      ]
                    : [],
                unstable_headerRightItems: () =>
                  showHeaderChrome
                    ? [
                        {
                          element: (
                            <View testID="search-header-profile-slot">
                              <ToolbarProfileAction onPress={openProfileSheet} />
                            </View>
                          ),
                          hidesSharedBackground: true,
                          type: 'custom' as const,
                        },
                      ]
                    : [],
              }
            : null),
          headerSearchBarOptions,
          ...(isIos
            ? null
            : {
                headerRight: () =>
                  showHeaderChrome ? <ProfileSheetTriggerButton onPress={openProfileSheet} /> : null,
                title: showHeaderChrome ? '找书' : '',
              }),
        }}
      />
      <SearchScreen onScroll={onScroll} query={query} />
    </>
  );
}
