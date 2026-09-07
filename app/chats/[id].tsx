import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { collection, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../src/config/firebase'; // Adjust path if needed
import { useAuth } from '../../src/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');

  const dark = useColorScheme() === 'dark';

  useEffect(() => {
    if (!id) return;

    // Notice there is no "query" or "orderBy" here.
    // This intentionally avoids the Firebase "Missing Index" error.
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
        return timeB - timeA; // Descending order (newest first)
      });

      setMessages(list);
    }, (error) => {
      // Silently swallow permission or missing-data errors
      console.log('Ignoring Firebase error:', error.message);
    });

    return unsubscribe;
  }, [id]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user) return;
    const textToSend = inputText.trim();
    setInputText(''); // Clear input immediately

    try {
      // 1. Add message to the subcollection
      await addDoc(collection(db, 'chats', id, 'messages'), {
        text: textToSend,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      // 2. Update the parent chat document so the main list shows the latest message
      await updateDoc(doc(db, 'chats', id), {
        lastMessage: { text: textToSend, senderId: user.uid },
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      // Ignore write errors
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: dark ? '#000' : '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: 'Messages' }} />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted // Keeps the list anchored to the bottom like iMessage
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;
          return (
            <View
              style={[
                styles.bubble,
                isMe ? styles.myBubble : styles.theirBubble,
                { backgroundColor: isMe ? '#007AFF' : dark ? '#2c2c2e' : '#e5e5ea' }
              ]}
            >
              <Text style={{ color: isMe ? '#fff' : dark ? '#fff' : '#000', fontSize: 16 }}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      <View style={[styles.inputContainer, { borderTopColor: dark ? '#2c2c2e' : '#eee' }]}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={dark ? '#8e8e93' : '#999'}
          style={[
            styles.input,
            { color: dark ? '#fff' : '#000', backgroundColor: dark ? '#1c1c1e' : '#f0f0f0' }
          ]}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: 12, borderRadius: 18, marginVertical: 4, marginHorizontal: 12, maxWidth: '75%' },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  inputContainer: { flexDirection: 'row', padding: 8, alignItems: 'center', borderTopWidth: 1 },
  input: { flex: 1, height: 40, borderRadius: 20, paddingHorizontal: 16, marginRight: 8 },
  sendButton: { paddingHorizontal: 12, justifyContent: 'center' },
});