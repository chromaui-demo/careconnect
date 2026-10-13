import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { api } from '@careconnect/api-client';
import { colors } from '@careconnect/design-system-native';

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>
);

export default function TabsLayout() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api.portal.getMessagesUnreadCount().then((r) => setUnread(r.count)).catch(() => setUnread(0));
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarIcon: icon('📋') }} />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: icon('✉️'), tabBarBadge: unread > 0 ? unread : undefined }}
      />
    </Tabs>
  );
}
