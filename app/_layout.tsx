import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../src/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

// --- MOVE IT HERE ---
// Force ignore Expo Router layout mismatch warnings on web
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('[Layout children]') || args[0].includes('downloadable font'))
    ) {
      return;
    }
    originalError(...args);
  };
}
// --------------------

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />

          {/* Target the nested screen routes explicitly instead of "(auth)" */}
          <Stack.Screen name="(auth)/login" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false, gestureEnabled: false }} />

          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}