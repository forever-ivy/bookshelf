import { Stack } from 'expo-router';

export default function SearchGroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShown: false,
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="borrow-now"
        options={{
          title: '',
        }}
      />
    </Stack>
  );
}
