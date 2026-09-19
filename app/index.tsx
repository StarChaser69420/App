// Root screen — the app's front door.
// Does nothing itself: waits for Firebase's session check, then
// redirects to login or the chat list.
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  // Wait for Firebase to determine whether the user is logged in
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Not logged in → login page
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Logged in → chat list
  return <Redirect href="/chats" />;
}