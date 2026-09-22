import { Tabs } from 'expo-router';
import { Bookmark, Bus, Map, Navigation } from 'lucide-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E11D48', // Vermelho RIT
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size || 22} />,
          tabBarButtonTestID: 'tab-bar-map',
          tabBarAccessibilityLabel: 'Mapa',
        }}
      />
      <Tabs.Screen
        name="lines"
        options={{
          title: 'Linhas',
          tabBarIcon: ({ color, size }) => <Bus color={color} size={size || 22} />,
          tabBarButtonTestID: 'tab-bar-lines',
          tabBarAccessibilityLabel: 'Linhas',
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: 'Como Ir',
          tabBarIcon: ({ color, size }) => <Navigation color={color} size={size || 22} />,
          tabBarButtonTestID: 'tab-bar-routes',
          tabBarAccessibilityLabel: 'Como Ir',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => <Bookmark color={color} size={size || 22} />,
          tabBarButtonTestID: 'tab-bar-favorites',
          tabBarAccessibilityLabel: 'Favoritos',
        }}
      />
    </Tabs>
  );
}
