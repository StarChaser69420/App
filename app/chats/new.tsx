import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import * as Clipboard from 'expo-clipboard';

export default function NewChatScreen() {
  const [chatName, setChatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [chatId, setChatId] = useState('');
  const [copied, setCopied] = useState(false);

  const { user, role } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  // Same permission check as the chat list FAB. The Firestore rules
  // enforce this on the server too — this check just gives a friendlier
  // error than a raw permission-denied.
  const canCreateChats = role === 'teacher' || role === 'admin';

  const createChat = async () => {
    setError('');
    if (!user) {
      setError('You must be logged in to create a chat.');
      return;
    }
    // Client-side guard (the rules block it anyway).
    if (!canCreateChats) {
      setError('Only teachers and admins can create chats.');
      return;
    }
    if (!chatName.trim()) {
      setError('Please enter a chat name.');
      return;
    }

    setLoading(true);
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        name: chatName.trim(),
        type: 'group',
        memberIds: [user.uid],
        roles: { [user.uid]: 'admin' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const inviteRef = await addDoc(collection(db, 'chatInvites'), {
        chatId: chatRef.id,
        createdBy: user.uid,
        used: false,
        createdAt: serverTimestamp(),
      });

      const generatedLink =
        `https://digi-tech-e7ac3.web.app/chats/join?invite=${inviteRef.id}`;

      setChatId(chatRef.id);
      setInviteLink(generatedLink);
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Could not create the chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInviteMessage = () => {
    return (
      `You're invited to join "${chatName.trim()}" on Digi-Tech!\n\n` +
      `Tap the link to join the chat:\n` +
      `${inviteLink}`
    );
  };

  // Alert.alert doesn't work on web, so the copy confirmation is inline.
  const copyInvite = async () => {
    await Clipboard.setStringAsync(getInviteMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Students/parents never see the form at all.
  if (!canCreateChats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Create New Chat
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>
          Only teachers and admins can create school chats. If you believe you
          should have access, contact the school office.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!inviteLink ? (
        <>
          <Text style={[styles.title, { color: colors.text }]}>
            Create New Chat
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Chat name"
            placeholderTextColor={colors.textMuted}
            value={chatName}
            onChangeText={setChatName}
            autoCapitalize="sentences"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={createChat}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Chat</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.text }]}>Chat Created!</Text>
          <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
            Send this invitation to the people you want in the chat.
          </Text>

          <View
            style={[
              styles.inviteBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.inviteText, { color: colors.text }]}>
              {getInviteMessage()}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={copyInvite}
          >
            <Text style={styles.buttonText}>
              {copied ? 'Copied!' : 'Copy Invite Message'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace(`/chats/${chatId}`)}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
              Open Chat
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  inviteBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },
  inviteText: { fontSize: 15, lineHeight: 22 },
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
  errorText: { color: '#ff3b30', marginBottom: 16 },
});