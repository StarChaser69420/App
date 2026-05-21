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
