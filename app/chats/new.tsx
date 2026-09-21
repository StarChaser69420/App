// ---------------------------------------------------------
// New Chat Screen (teacher/admin only)
//
// FLOW:
//   1. Role check - students/parents never see the form; they get
//      an explanation instead. (The Firestore rules enforce this
//      server-side too - this is the friendly UI layer of the
//      same permission.)
//   2. Teacher types a chat name and taps Create Chat.
//   3. Two Firestore documents are created:
//        - chats/{id}        the chat itself (creator = only member,
//                            admin of the chat)
//        - chatInvites/{id}  a permanent, multi-use invite document
//   4. The invite link is built from the invite doc's ID and
//      displayed with a Copy button (Alert doesn't work on web,
//      so all feedback is inline).
//   5. Open Chat navigates straight into the new chat.
//
// NOTE ON INVITES: the invite created here never expires and never
// burns - anyone with the link can join, forever. The Invite button
// in the chat header (see chats/_layout.tsx) reuses this same
// document rather than making duplicates, so each chat has exactly
// one canonical link.
// ---------------------------------------------------------

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
  // --- State ---
  // chatName: the name typed into the input.
  // loading: true while Firestore writes run - disables the button so
  //          a double-tap can't create two identical chats.
  // error:   validation / permission message shown above the input.
  // inviteLink: set once creation succeeds - switches the screen from
  //          the form view to the success view.
  // chatId:  the new chat's ID, kept so "Open Chat" can navigate to it.
  // copied:  drives the "Copied!" button feedback for 2 seconds.
  const [chatName, setChatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [chatId, setChatId] = useState('');
  const [copied, setCopied] = useState(false);

  // user = who is logged in, role = their role from Firestore
  // (loaded live via onSnapshot in AuthContext).
  const { user, role } = useAuth();
  const router = useRouter();

  // Every colour comes from the theme hook - this screen follows the
  // system dark/light setting with zero hardcoded colours.
  const { colors } = useTheme();

  // Permission check - identical to the check on the chat list FAB,
  // the composer in [id].tsx, and the Invite button in _layout.tsx.
  // Four places, one rule: teachers and admins create, everyone else
  // reads. The Firestore rules enforce it server-side; this check
  // gives a friendlier message than a raw permission-denied error.
  const canCreateChats = role === 'teacher' || role === 'admin';

  // --- Create the chat and its invite ---
  // Guards run cheapest-first: login, then role, then input - so an
  // invalid request never even reaches Firestore.
  const createChat = async () => {
    setError('');
    if (!user) {
      setError('You must be logged in to create a chat.');
      return;
    }
    // Client-side guard (the rules block it anyway - defence in depth).
    if (!canCreateChats) {
      setError('Only teachers and admins can create chats.');
      return;
    }
    // trim() so a name of only spaces fails, not creates "   ".
    if (!chatName.trim()) {
      setError('Please enter a chat name.');
      return;
    }

    setLoading(true);
    try {
      // --- Step 1: create the chat document ---
      const chatRef = await addDoc(collection(db, 'chats'), {
        // Display name shown in chat lists and the header title.
        name: chatName.trim(),

        // All chats from this screen are group chats (one-to-one
        // chats aren't part of the app's model).
        type: 'group',

        // Start with only the creator as a member. Everyone else
        // arrives via the invite link.
        memberIds: [user.uid],

        // Chat-level roles map. NOTE: this is display-only metadata -
        // real permissions come from users/{uid}.role, which no client
        // can write. Kept so the chat knows who its admin is.
        roles: { [user.uid]: 'admin' },

        // Timestamps: createdAt for records, updatedAt for sorting -
        // the chat list orders by updatedAt desc, so joining or
        // messaging bumps a chat back to the top.
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // --- Step 2: create the invite document ---
      // The invite doc's ID IS the secret in the link. Multi-use and
      // never expires: used stays false forever (nothing in the client
      // ever flips it). The Invite button in the chat header queries
      // for this same doc instead of creating another one.
      const inviteRef = await addDoc(collection(db, 'chatInvites'), {
        chatId: chatRef.id,
        createdBy: user.uid,
        used: false,
        createdAt: serverTimestamp(),
      });

      // --- Step 3: build the shareable link ---
      // Hardcoded to the production domain - the join screen reads the
      // "invite" query parameter. On localhost testing, the domain has
      // to be swapped manually (a documented dev limitation).
      const generatedLink =
        `https://digi-tech-e7ac3.web.app/chats/join?invite=${inviteRef.id}`;

      // Switch to the success view.
      setChatId(chatRef.id);
      setInviteLink(generatedLink);
    } catch (err) {
      // Log the technical detail for debugging, show the user
      // something friendly.
      console.error('Error creating chat:', err);
      setError('Could not create the chat. Please try again.');
    } finally {
      // Always stop the spinner, success or failure.
      setLoading(false);
    }
  };

  // The full message that gets copied to the clipboard - a complete
  // sentence, not a bare URL, so it pastes sensibly into an email
  // or newsletter (the school's real distribution path).
  const getInviteMessage = () => {
    return (
      `You're invited to join "${chatName.trim()}" on Digi-Tech!\n\n` +
      `Tap the link to join the chat:\n` +
      `${inviteLink}`
    );
  };

  // Copy to clipboard with inline confirmation. Alert.alert doesn't
  // work on web, so the button text itself becomes the feedback
  // ("Copied!" for 2 seconds, then reverts).
  const copyInvite = async () => {
    await Clipboard.setStringAsync(getInviteMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Permission gate ---
  // Students and parents never see the form at all - they get a plain
  // explanation instead of a disabled button, because a greyed-out
  // button invites the question "why can't I press it?"
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
      {/* Form view OR success view, switched by whether an invite link
          exists in state. */}
      {!inviteLink ? (
        <>
          <Text style={[styles.title, { color: colors.text }]}>
            Create New Chat
          </Text>

          {/* Error line only renders when there's an error to show -
              no empty red box taking up space otherwise. */}
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
            // Capitalise the first letter of the name - chat names are
            // proper nouns ("School Notices", not "school notices").
            autoCapitalize="sentences"
          />

          {/* Disabled while loading so a double-tap can't create
              two chats with the same name. */}
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
          {/* ---------- Success view ---------- */}
          <Text style={[styles.title, { color: colors.text }]}>Chat Created!</Text>
          <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
            Send this invitation to the people you want in the chat.
          </Text>

          {/* Grey box showing the exact message that will be copied -
              the teacher sees precisely what recipients will receive. */}
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

          {/* Text-only secondary action (no filled background) -
              opening the chat is the less important action here;
              copying the invite is the primary one. replace() so
              pressing back won't return to this form. */}
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

// All structural styling. Colours are applied inline from the theme
// so light/dark mode works without duplicated stylesheets.
const styles = StyleSheet.create({
  // 24px padding - 3 steps up the 8px grid.
  container: { flex: 1, padding: 24, justifyContent: 'center' },

  // 28pt bold - the screen title, top of the font hierarchy.
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16, // body text size
    marginBottom: 16,
  },

  // Primary action button - filled with the accent blue (blue is
  // reserved for interactive elements throughout the app).
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Bordered preview box for the invite message.
  inviteBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },
  inviteText: { fontSize: 15, lineHeight: 22 },

  // Secondary (text-only) button - visually lighter than the primary.
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },

  // Error red - the one non-theme colour, kept constant across
  // light and dark mode so errors always read as errors.
  errorText: { color: '#ff3b30', marginBottom: 16 },
});