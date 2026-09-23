import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
      <Tabs.Screen name="operations" options={{ title: 'Operations' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="packing" options={{ href: null }} />
      <Tabs.Screen name="putaway" options={{ href: null }} />
    </Tabs>
  );
}
