import { Stack } from 'expo-router';
import React from 'react';

import { FavoritesLibraryScreen } from '@/components/favorites/favorites-library-screen';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { resolveSearchText } from '@/components/search/search-screen';

export default function FavoritesRoute() {
  const [query, setQuery] = React.useState('');
  const handleSearchTextChange = React.useCallback((value: unknown) => {
    setQuery(resolveSearchText(value));
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            onChangeText: handleSearchTextChange,
            onSearchButtonPress: handleSearchTextChange,
            placement: 'automatic',
            placeholder: '搜索收藏图书',
          },
        }}
      />
      <ProtectedRoute>
        <FavoritesLibraryScreen query={query} />
      </ProtectedRoute>
    </>
  );
}
