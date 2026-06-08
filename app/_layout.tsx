import { useEffect, useRef, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { AppState, AppStateStatus, View, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useSecurityStore } from '@/store/securityStore';
import { Colors } from '@/constants/colors';
import LockScreen from '@/app/lock';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function SecurityLayer({ children }: { children: React.ReactNode }) {
  const { isLocked, isBlurred, hasPIN, lock, setBlurred, unlock, lockTimeoutMinutes, lastActiveAt } = useSecurityStore();
  const { user } = useAuthStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  const handleAppStateChange = useCallback((nextState: AppStateStatus) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;

    if (nextState === 'background' || nextState === 'inactive') {
      setBlurred(true);
      backgroundTimeRef.current = Date.now();
      if (hasPIN) lock();
    } else if (nextState === 'active') {
      setBlurred(false);
      if (hasPIN) {
        if (lockTimeoutMinutes > 0 && backgroundTimeRef.current) {
          const elapsed = (Date.now() - backgroundTimeRef.current) / 1000 / 60;
          if (elapsed >= lockTimeoutMinutes) {
            lock();
          }
        } else if (lockTimeoutMinutes === 0) {
          lock();
        }
        backgroundTimeRef.current = null;
      }
    }
  }, [hasPIN, lock, setBlurred, lockTimeoutMinutes]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [handleAppStateChange]);

  return (
    <>
      {children}
      {isBlurred && Platform.OS !== 'web' && (
        <View style={[StyleSheet.absoluteFillObject, styles.blurOverlay]} />
      )}
      {isLocked && user && (
        <View style={StyleSheet.absoluteFillObject}>
          <LockScreen onUnlock={unlock} />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const initSecurity = useSecurityStore((s) => s.initialize);

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    const unsub = initialize();
    initSecurity();
    return unsub;
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SecurityLayer>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.light.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="lock" />
              <Stack.Screen name="pin-setup" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="diary/new"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="diary/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="unsent/index"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="unsent/new"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="study/index"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="memories/new"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="settings"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="vault/index"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="vault/new"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>
          </SecurityLayer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    backgroundColor: '#F0F8FF',
    zIndex: 9999,
  },
});
