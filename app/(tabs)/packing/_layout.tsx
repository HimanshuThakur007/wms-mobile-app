import React from 'react';
import { Stack } from 'expo-router';

export default function PackingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="wms-registration" options={{ headerShown: false }} />
      <Stack.Screen name="wms-scanning" options={{ headerShown: false }} />
      <Stack.Screen name="container-registration" options={{ headerShown: false }} />
      <Stack.Screen name="container-scanning" options={{ headerShown: false }} />
    </Stack>
  );
}
