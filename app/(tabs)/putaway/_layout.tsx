import React from 'react';
import { Stack } from 'expo-router';

export default function PutawayLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="scanning" options={{ headerShown: false }} />
    </Stack>
  );
}
