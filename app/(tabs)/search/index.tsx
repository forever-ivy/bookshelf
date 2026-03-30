import { Stack } from 'expo-router';
import React from 'react';

import { SearchScreen, resolveSearchText } from '@/components/search/search-screen';

export default function SearchRoute() {
  const [query, setQuery] = React.useState('机器学习');
  const handleSearchTextChange = React.useCallback((value: unknown) => {
    setQuery(resolveSearchText(value));
  }, []);
  const headerSearchBarOptions = React.useMemo(
    () => ({
      onChangeText: handleSearchTextChange,
      onSearchButtonPress: handleSearchTextChange,
      placement: 'automatic' as const,
      placeholder: '搜索书名、作者、课程或自然语言',
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
      <SearchScreen query={query} />
    </>
  );
}
