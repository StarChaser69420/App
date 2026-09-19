// ---------------------------------------------------------
// Chats layout — the top navigation bar for every screen in
// the chats folder.
//
//   - index (chat list): "Chats" title + Log Out button. The list
//     is the root screen of this stack, so it has nothing to go
//     back to — its header carries logout instead.
//   - [id], new, join: title + the standard platform back button,
//     which appears automatically because these screens are pushed
//     on top of the list.
//
// Because the styling lives here (not in each screen), every
// header is identical — consistent navigation bar at the top the
// entire time.
// ---------------------------------------------------------

import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/src/contexts/AuthContext';

export default function ChatsLayout() {
  // Every colour comes from the theme hook, so the header follows
  // the system dark/light setting like the rest of the app.
  const { colors } = useTheme();

  // logout() from AuthContext — this was the app's only way out
  // before this button existed.
  const { logout } = useAuth();
  const router = useRouter();

  // Sign out and return to login. replace() (not push) clears the
  // navigation stack, so the user can't press back into the app
  // while logged out.
  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (e) {
      console.log('Logout failed:', e);
    }
  };

  return (
    <Stack
      screenOptions={{
        headerShown: true,

        // Header follows the theme palette, same colours as every screen.
        headerStyle: {
          backgroundColor: colors.background,

          // Separator line marking where the header ends and the
          // content begins. Uses the theme border colour — dark
          // grey in dark mode, light grey in light mode — so it
          // follows the palette instead of a hardcoded grey.
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },

        // Accent blue (back arrow, Log Out) — blue is reserved for
        // interactive elements across the whole app, per convention.
        headerTintColor: colors.accent,

        // Title: 17pt semibold = iOS standard title size, part of
        // the font sizing hierarchy for important text.
        headerTitleStyle: {
          color: colors.text,
          fontSize: 17,
          fontWeight: '600',
        },

        // Shadow OFF — the border line above replaces it. Having
        // both would double up into a messy edge.
        headerShadowVisible: false,

        // Web/Android default shows the previous screen's title
        // next to the back arrow; off keeps the header clean.
        headerBackTitleVisible: false,
      }}
    >
      {/* Chat list — the root screen of this stack, so it gets no
          back button. Logout lives here instead. */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Chats',
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>
                Log Out
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Pushed screens — back button appears automatically because
          each of these is reached by pushing on top of the list. */}
      <Stack.Screen name="[id]" options={{ title: 'Messages' }} />
      <Stack.Screen name="new" options={{ title: 'New Chat' }} />
      <Stack.Screen name="join" options={{ title: 'Join Chat' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    // 8px horizontal padding — the 8px spacing grid. Vertical is
    // 12px: a deliberate off-grid value so the total touch target
    // clears the 44pt minimum from Apple's HIG. When the spacing
    // convention and the accessibility convention conflict,
    // accessibility wins.
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
});