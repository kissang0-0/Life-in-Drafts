import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';

export default function Index() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;
    if (user) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/auth');
    }
  }, [initialized, user]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background }}>
      <ActivityIndicator color={Colors.light.primary} size="large" />
    </View>
  );
}
