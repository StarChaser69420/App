import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const handleLogin = async () => {
    setError('');
    if (!email || !password) return setError('Please fill in all fields');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email address'); break;
        case 'auth/user-not-found':
          setError('No account found with this email'); break;
        case 'auth/wrong-password':
          setError('Incorrect password'); break;
        case 'auth/too-many-requests':
          setError('Too many attempts, try again later'); break;
        default:
          setError('Login failed, please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#000' : '#fff' }]}>
      <Text style={[styles.title, { color: dark ? '#fff' : '#000' }]}>Sign In</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TextInput
        style={[styles.input, {
          backgroundColor: dark ? '#1c1c1e' : '#f2f2f7',
          borderColor: dark ? '#3a3a3c' : '#ddd',
          color: dark ? '#fff' : '#000',
        }]}
        placeholder="Email"
        placeholderTextColor={dark ? '#8e8e93' : '#999'}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, {
          backgroundColor: dark ? '#1c1c1e' : '#f2f2f7',
          borderColor: dark ? '#3a3a3c' : '#ddd',
          color: dark ? '#fff' : '#000',
        }]}
        placeholder="Password"
        placeholderTextColor={dark ? '#8e8e93' : '#999'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Sign In</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ alignItems: 'center', marginTop: 16 }}>
        <Text style={{ color: '#007AFF' }}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32 },
  errorBox: {
    backgroundColor: '#ff3b3020',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#ff3b30', fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});