import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
//redirect based on auth state
export default function Index() {
  const { user, loading } = useAuth();
//display loading wheel
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
// authenticated goes to tabs unauthenticated goes to login page
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}