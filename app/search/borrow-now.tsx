import { Stack } from 'expo-router';
import React from 'react';

import { SearchScreen, resolveSearchText } from '@/components/search/search-screen';

export default function BorrowNowSearchRoute() {
  const [query, setQuery] = React.useState('');
  const handleSearchTextChange = React.useCallback((value: unknown) => {
    setQuery(resolveSearchText(value));
  }, []);
  const headerSearchBarOptions = React.useMemo(
    () => ({
      onChangeText: handleSearchTextChange,
      onSearchButtonPress: handleSearchTextChange,
      placement: 'automatic' as const,
      placeholder: '搜索想立刻借走的书',
    }),
    [handleSearchTextChange]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions,
        }}
      />
      <SearchScreen borrowNowMode query={query} />
    </>
  );
}
