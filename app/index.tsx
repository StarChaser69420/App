import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '../src/config/firebase';
import { useAuth } from '../src/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
//helps with error catching
type ChatSummary = {
  id: string;
  name: string;
  type: string;
  lastMessage?: { text: string; senderId: string; createdAt: any };
  updatedAt?: any;
};

export default function ChatsListScreen() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('memberIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatSummary[];
        setChats(list);
        setLoading(false);
      },
      (error) => {
        console.error('Chat list listener error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: dark ? '#000' : '#fff' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: dark ? '#000' : '#fff' }]}>
        <Text style={{ color: dark ? '#8e8e93' : '#666' }}>
          You're not in any chats yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#000' : '#fff' }}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dark ? '#2c2c2e' : '#eee' }]}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <Text style={[styles.chatName, { color: dark ? '#fff' : '#000' }]}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text
                numberOfLines={1}
                style={[styles.lastMessage, { color: dark ? '#8e8e93' : '#666' }]}
              >
                {item.lastMessage.text}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  chatName: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  lastMessage: { fontSize: 14 },
});