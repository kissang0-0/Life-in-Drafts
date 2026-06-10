import { Tabs, Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useDataSync } from '@/hooks/useData';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useDataSync();

  if (!user) return <Redirect href="/auth" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
          shadowColor: colors.shadowDeep,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Dear Me',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nest"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "To Do/n't",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="unsent"
        options={{
          title: 'Unsent',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="unsocial"
        options={{
          title: 'Unsocial',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="planet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cycle"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="cloud"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="vault"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="garden"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="memoryjar"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="forkcast"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="siphappens"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="lightsout"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="whatlingers"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="barefaced"
        options={{ href: null }}
      />
    </Tabs>
  );
}
