import { Stack } from 'expo-router';

export default function ChatsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Messages',
          headerShown: true,
        }}
      />
    </Stack>
  );
}