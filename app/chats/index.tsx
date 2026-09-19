import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '../../src/config/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';

type ChatSummary = {
  id: string;
  name: string;
  type: string;
  memberIds?: string[];
  roles?: Record<string, string>;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
  };
  updatedAt?: any;
};

export default function ChatsListScreen() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // user = who is logged in, role = their role from Firestore.
  const { user, role } = useAuth();

  const router = useRouter();

  // Every colour comes from the theme hook, so the whole screen follows
  // the system dark/light setting.
  const { colors } = useTheme();

  // Permission check: only teachers and admins can create chats, so only
  // they see the floating "+" button. Students and parents still read
  // every chat they are a member of.
  const canCreateChats = role === 'teacher' || role === 'admin';

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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>
          You're not in any chats yet
        </Text>

        {/* Students/parents never see this button — only teachers/admins. */}
        {canCreateChats && (
          <TouchableOpacity
            style={[styles.newChatButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/chats/new')}
          >
            <Text style={styles.newChatText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/chats/${item.id}`)}
          >
            <Text style={[styles.chatName, { color: colors.text }]}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text
                numberOfLines={1}
                style={[styles.lastMessage, { color: colors.textMuted }]}
              >
                {item.lastMessage.text}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      {canCreateChats && (
        <TouchableOpacity
          style={[styles.newChatButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/chats/new')}
        >
          <Text style={styles.newChatText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
  },
  newChatButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newChatText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
});