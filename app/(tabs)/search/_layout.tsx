import { Stack } from 'expo-router';

export default function SearchLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShown: false,
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: '',
        }}
      />
    </Stack>
  );
}
