import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { collection, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';

export default function ChatScreen() {
  // The chat ID from the URL, e.g. /chats/abc123
  const { id } = useLocalSearchParams<{ id: string }>();

  // user = who is logged in, role = their role from Firestore.
  const { user, role } = useAuth();

  // Permission check - same check as the FAB on the chat list, and the
  // same check the Firestore rules enforce on the server. Three layers:
  // hide the UI, guard the function, block the write.
  const canPost = role === 'teacher' || role === 'admin';

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');

  // The chat's display name, loaded from the chat document so the
  // header shows the real chat name instead of a generic "Messages".
  const [chatName, setChatName] = useState('');

  const { dark, colors } = useTheme();

  // --- Responsive composer sizing (8px grid, phones-first) ---
  // 768px is the tablet/desktop breakpoint. Phones get the baseline,
  // wider screens scale up. useWindowDimensions updates live, so
  // dragging the browser window bigger resizes the bar in real time.
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const inputHeight = isWide ? 56 : 48;
  const inputFont = isWide ? 17 : 16;
  const barPadding = isWide ? 16 : 8;
  const sendPadding = isWide ? 16 : 12;

  // --- Chat name listener ---
  // Reads the chat document (members are allowed to read it) and feeds
  // the header title. If the read is ever denied, the title just stays
  // "Messages" - the error callback stops it becoming an uncaught error.
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(
      doc(db, 'chats', id),
      (snap) => {
        if (snap.exists()) {
          setChatName(snap.data().name ?? 'Messages');
        }
      },
      (error) => {
        console.log('Chat name listener error:', error.message);
      }
    );

    return unsubscribe;
  }, [id]);

  // --- Messages listener ---
  useEffect(() => {
    if (!id) return;
    const messagesRef = collection(db, 'chats', id, 'messages');

    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort messages on the client side to avoid Firebase index requirements
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA; // Newest first (FlatList is inverted)
      });

      setMessages(list);
    }, (error) => {
      // Non-members get permission-denied here and just see an empty chat.
      console.log('Messages listener error:', error.message);
    });

    return unsubscribe;
  }, [id]);

  const sendMessage = async () => {
    // Client-side guard. The rules block the write anyway - this just
    // avoids firing a request that is guaranteed to fail.
    if (!canPost || !inputText.trim() || !user) return;

    const textToSend = inputText.trim();
    setInputText(''); // Clear input immediately

    try {
      // 1. Add message to the subcollection. senderRole is stored on the
      // message itself so the app never needs to read another user's
      // profile document (privacy) - and so the label below can render
      // without extra reads.
      await addDoc(collection(db, 'chats', id, 'messages'), {
        text: textToSend,
        senderId: user.uid,
        senderRole: role,
        createdAt: serverTimestamp(),
      });

      // 2. Update the parent chat so the list shows the latest message
      await updateDoc(doc(db, 'chats', id), {
        lastMessage: { text: textToSend, senderId: user.uid },
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      // If the write is denied or fails, put the text back in the box so
      // the user doesn't lose their message with no explanation.
      setInputText(textToSend);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Sets this screen's header title dynamically from the chat name.
          This MERGES with the layout's options - the Invite button in the
          header comes from the layout and stays put; only the title
          changes here. */}
      <Stack.Screen options={{ title: chatName || 'Messages' }} />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted // Keeps the list anchored to the bottom like iMessage
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;

          // Small label showing who posted. senderRole was stored on the
          // message at send time, so this needs no extra database reads.
          // Old messages sent before senderRole existed simply render
          // without a label (undefined falls through to null).
          // Only shown on other people's messages - your own are obvious.
          const senderLabel =
            item.senderRole === 'teacher' ? 'Teacher'
            : item.senderRole === 'admin' ? 'Admin'
            : null;

          return (
            <View
              style={[
                styles.bubble,
                isMe ? styles.myBubble : styles.theirBubble,
                // My bubbles use the accent colour; theirs use greys that
                // sit slightly lighter than the card colour, kept as a
                // dark ternary to stay pixel-identical to before.
                { backgroundColor: isMe ? colors.accent : dark ? '#2c2c2e' : '#e5e5ea' }
              ]}
            >
              {!isMe && senderLabel && (
                <Text style={[styles.senderLabel, { color: colors.textMuted }]}>
                  {senderLabel}
                </Text>
              )}
              <Text style={{ color: isMe ? '#fff' : colors.text, fontSize: inputFont }}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      {canPost ? (
        // Teachers and admins get the composer.
        <View
          style={[
            styles.inputContainer,
            { borderTopColor: colors.border, padding: barPadding },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.inputBackground,
                height: inputHeight,
                borderRadius: inputHeight / 2,      // pill shape at any size
                paddingHorizontal: inputHeight / 2, // padding scales with height
                fontSize: inputFont,
                marginRight: 8,
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.sendButton, { paddingHorizontal: sendPadding }]}
            onPress={sendMessage}
          >
            <Text style={{ color: colors.accent, fontSize: inputFont, fontWeight: '600' }}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Students and parents see an explicit read-only bar instead of a
        // missing input box - makes the permission obvious in the UI and
        // in screenshots of the app.
        <View
          style={[
            styles.readOnlyBar,
            { borderTopColor: colors.border, padding: isWide ? 20 : 14 },
          ]}
        >
          <Text style={{ color: colors.textMuted, fontSize: isWide ? 15 : 13 }}>
            Read only - only teachers and admins can post to this chat
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: 12, borderRadius: 18, marginVertical: 4, marginHorizontal: 12, maxWidth: '75%' },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },

  // Small "Teacher"/"Admin" label above incoming messages. 12pt - the
  // smallest step in the font hierarchy (body 16, list names 17, titles
  // 17 semibold).
  senderLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },

  // Sizes are computed inline from useWindowDimensions, so no fixed
  // height or padding here - only the structural properties.
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  readOnlyBar: { alignItems: 'center', borderTopWidth: 1 },
  input: { flex: 1 },
  sendButton: {
    justifyContent: 'center',
    // 12px vertical keeps the touch target at least 44pt at both sizes.
    paddingVertical: 12,
  },
});