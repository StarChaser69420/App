// ---------------------------------------------------------
// Root layout — wraps the entire app.
//
//   - AuthProvider: makes useAuth() (user + role) available to
//     every screen below it.
//   - ThemeProvider: react-navigation's dark/light theme, driven
//     by the system setting via useColorScheme.
//
// This layout NEVER draws headers itself. Each section (auth
// screens, chats) draws its own — that's why every entry below
// sets headerShown: false.
// ---------------------------------------------------------

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/src/contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider
        value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
      >
        <Stack>
          {/* Root screen ("/") — the auth gatekeeper.
              Redirects to login or /chats. No header: it only ever
              shows a spinner or fires a redirect. */}
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />

          {/* Auth group — login and register. Bracketed folder name
              means the group is invisible in URLs (/login, /register).
              gestureEnabled off so users can't swipe back into the
              app after logging out. */}
          <Stack.Screen
            name="(auth)"
            options={{ headerShown: false, gestureEnabled: false }}
          />

          {/* Chats section — the whole main app. headerShown: false
              here is deliberate: it stops the ROOT stack drawing its
              own header around the section. The chats/_layout.tsx
              draws the real headers (with the separator line)
              inside instead. If this were true, you'd get two
              stacked headers on every screen. */}
          <Stack.Screen
            name="chats"
            options={{ headerShown: false }}
          />
        </Stack>

        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}