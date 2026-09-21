// ---------------------------------------------------------
// Join Chat Screen — reached via an invite link
//
// URL shape: /chats/join?invite=<chatInvites document ID>
//
// Flow:
//   1. Not logged in → redirect to login, carrying this URL as a
//      "redirect" param so the user is sent back here after signing in.
//   2. Logged in → run a Firestore transaction that:
//        - reads the invite and checks it's valid and unused
//        - adds the user to the chat (memberIds + roles)
//        - burns the invite so it can only ever be used once
//   3. Navigate into the chat.
// ---------------------------------------------------------

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';

// Firestore helpers:
//   runTransaction  - every read/write succeeds together or fails together,
//                     so two people can't race the same single-use invite
//   arrayUnion      - adds a value to an array only if it isn't already there
//   serverTimestamp - trusted server-side time (a device clock can be wrong)
import {
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';

import { db } from '../../src/config/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';

export default function JoinChatScreen() {
  // The invite document ID from the URL query string.
  const { invite } = useLocalSearchParams<{ invite: string }>();

  // user = who is logged in, loading = Firebase still checking the session.
  const { user, loading } = useAuth();

  const router = useRouter();
  const { colors } = useTheme();

  // Status line shown under the spinner while joining / if something fails.
  const [status, setStatus] = useState('Joining chat…');

  // Attempt the join once we have both an invite and a logged-in user.
  // Re-runs when the login state changes — e.g. the user just came back
  // from the login screen via the redirect param.
  useEffect(() => {
    if (!invite || !user) return;
    joinChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite, user]);

  const joinChat = async () => {
    try {
      const inviteRef = doc(db, 'chatInvites', invite!);

      const chatId = await runTransaction(db, async (tx) => {
        // --- Read and validate the invite ---
        const inviteSnap = await tx.get(inviteRef);

        if (!inviteSnap.exists()) {
          throw new Error('This invite link is invalid.');
        }

        const inviteData = inviteSnap.data();

        if (inviteData.used) {
          // If THIS user already used the invite, they're already a member —
          // send them to the chat instead of showing an error.
          if (inviteData.usedBy === user!.uid) {
            return inviteData.chatId;
          }
          throw new Error('This invite link has already been used.');
        }

        // The creator is already a member — nothing to join.
        if (inviteData.createdBy === user!.uid) {
          return inviteData.chatId;
        }

        // --- Add the user to the chat ---
        // arrayUnion means we never need to READ the chat document first.
        // The security rules only allow members to read a chat, and the
        // joining user isn't a member yet — but a signed-in user IS allowed
        // to update memberIds/roles/updatedAt, and arrayUnion is idempotent
        // if the user is somehow already in the list.
        const chatRef = doc(db, 'chats', inviteData.chatId);
        tx.update(chatRef, {
          memberIds: arrayUnion(user!.uid),
          [`roles.${user!.uid}`]: 'member',
          updatedAt: serverTimestamp(),
        });

        return inviteData.chatId;
      });

      // Success — go to the chat list, not straight into the chat.
      // Landing on the list guarantees the header (back button + logout)
      // is always available, and the newly joined chat sits at the top
      // because joining updated its "updatedAt" timestamp.
      router.replace('/chats');
    } catch (err: any) {
      setStatus(err.message ?? 'Could not join the chat.');
    }
  };

  // Wait for Firebase's session check before deciding anything.
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // No invite code in the URL — nothing to join.
  if (!invite) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.textMuted }]}>
          This invite link is missing its code.
        </Text>
      </View>
    );
  }

  // Not logged in — go to login, but carry this full path as a param so the
  // login/register screens can send the user straight back here after they
  // sign in. Without this, the invite link is lost on the redirect.
  if (!user) {
    return (
      <Redirect
        href={{
          pathname: '/(auth)/login',
          params: { redirect: `/chats/join?invite=${invite}` },
        }}
      />
    );
  }

  // Normal state: spinner + status while the transaction runs.
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" />
      <Text style={[styles.text, { color: colors.textMuted }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
});