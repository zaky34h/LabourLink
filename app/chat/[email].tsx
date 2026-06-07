import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import {
  getMessagesWithPeer,
  getTypingStatus,
  markThreadRead,
  closeThread,
  sendMessage,
  setTypingStatus,
  type ChatMessage,
} from "../../src/chat/storage";
import { getUserByEmail } from "../../src/auth/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

export default function ChatWithPeer() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const peerEmail = decodeURIComponent(email ?? "");
  const { user } = useCurrentUser();

  const [peerName, setPeerName] = useState<string>(peerEmail);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [meTyping, setMeTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastTypingSentRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadErrorShownRef = useRef(false);

  async function load() {
    if (!user?.email) return;
    if (!refreshing) setLoadingMessages(true);
    try {
      const [msgs, typing] = await Promise.all([
        getMessagesWithPeer(user.email, peerEmail),
        getTypingStatus(peerEmail),
      ]);
      setMessages((current) => {
        const pending = current.filter((message) => message.id.startsWith("temp-"));
        const merged = [...msgs];
        for (const message of pending) {
          const exists = merged.some(
            (candidate) =>
              candidate.from.toLowerCase() === message.from.toLowerCase() &&
              candidate.to.toLowerCase() === message.to.toLowerCase() &&
              candidate.text === message.text
          );
          if (!exists) merged.push(message);
        }
        return merged.sort((a, b) => a.createdAt - b.createdAt);
      });
      setMeTyping(typing.meTyping);
      setPeerTyping(typing.peerTyping);
      loadErrorShownRef.current = false;
      await markThreadRead(peerEmail);
    } catch (error: any) {
      if (!loadErrorShownRef.current) {
        Alert.alert("Couldn’t load chat", error?.message || "Please try again.");
        loadErrorShownRef.current = true;
      }
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    async function loadPeerName() {
      const peer = await getUserByEmail(peerEmail);
      if (peer) setPeerName(`${peer.firstName} ${peer.lastName}`);
    }
    void loadPeerName();
  }, [peerEmail]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2500);
    return () => {
      clearInterval(interval);
    };
  }, [user?.email, peerEmail]);

  useEffect(() => {
    const nextTyping = text.trim().length > 0;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    typingTimerRef.current = setTimeout(async () => {
      if (!user?.email) return;
      if (lastTypingSentRef.current === nextTyping) return;
      lastTypingSentRef.current = nextTyping;
      const res = await setTypingStatus(peerEmail, nextTyping);
      if (res.ok) setMeTyping(nextTyping);
    }, 250);

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [text, peerEmail, user?.email]);

  useEffect(() => {
    return () => {
      if (!lastTypingSentRef.current) return;
      setTypingStatus(peerEmail, false);
    };
  }, [peerEmail]);

  const myEmail = user?.email ?? "";

  const grouped = useMemo(() => messages, [messages]);

  async function onSend() {
    const trimmed = text.trim();
    if (!user?.email || !trimmed || sending) return;

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      from: user.email,
      to: peerEmail,
      text: trimmed,
      createdAt: Date.now(),
    };

    setSending(true);
    setMessages((current) => [...current, optimisticMessage].sort((a, b) => a.createdAt - b.createdAt));
    setText("");
    setMeTyping(false);
    lastTypingSentRef.current = false;
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);

    await setTypingStatus(peerEmail, false);
    const res = await sendMessage(user.email, peerEmail, trimmed);
    if (!res.ok) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setSending(false);
      return Alert.alert("Can’t send", res.error);
    }

    setMessages((current) =>
      current
        .map((message) => (message.id === optimisticMessage.id ? res.message : message))
        .sort((a, b) => a.createdAt - b.createdAt)
    );
    setSending(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function onCloseChat() {
    Alert.alert(
      "Close chat?",
      "This will remove the conversation from your messages list until a new message is sent.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Chat",
          style: "destructive",
          onPress: async () => {
            const res = await closeThread(peerEmail);
            if (!res.ok) {
              Alert.alert("Couldn’t close chat", res.error);
              return;
            }
            router.back();
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Messages */}
      <FlatList
        ref={listRef}
        data={grouped}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: 60, flexGrow: 1 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View style={{ paddingBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Pressable onPress={() => router.back()} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Back</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }} numberOfLines={1}>
                {peerName}
              </Text>
              <Text style={type.secondary} numberOfLines={1}>
                {peerEmail}
              </Text>
              {peerTyping ? (
                <Text style={{ fontFamily, marginTop: 2, color: colors.pendingText, fontWeight: fontWeight.bold, fontSize: fontSize.caption }}>
                  Typing...
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onCloseChat} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { fontSize: fontSize.caption }]}>Close Chat</Text>
            </Pressable>
          </View>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.from.toLowerCase() === myEmail.toLowerCase();
          return (
            <View style={{ marginBottom: spacing.sm, alignItems: mine ? "flex-end" : "flex-start" }}>
              <View
                style={{
                  maxWidth: "80%",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: radii.xl,
                  backgroundColor: mine ? colors.primary : colors.surface,
                  borderWidth: mine ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontFamily, color: mine ? colors.onPrimary : colors.text, fontWeight: fontWeight.medium }}>
                  {item.text}
                </Text>
                <Text style={{ fontFamily, color: mine ? colors.onPrimary : colors.textSecondary, marginTop: 6, fontSize: fontSize.caption, opacity: mine ? 0.8 : 1 }}>
                  {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <Text style={{ ...type.secondary, textAlign: "center" }}>
              {loadingMessages ? "Loading messages..." : "No messages yet. Say hello 👋"}
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={{ padding: spacing.md, paddingBottom: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
        {meTyping ? (
          <Text style={{ ...type.secondary, marginBottom: spacing.sm, fontSize: fontSize.caption }}>
            You are typing...
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.lg,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: colors.field,
              fontFamily,
              fontSize: fontSize.body,
              color: colors.text,
            }}
          />
          <Pressable
            onPress={onSend}
            disabled={sending || text.trim().length === 0}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: radii.lg,
              backgroundColor: colors.primary,
              opacity: sending || text.trim().length === 0 ? 0.45 : 1,
            }}
          >
            <Text style={{ fontFamily, color: colors.onPrimary, fontWeight: fontWeight.heavy }}>
              {sending ? "Sending..." : "Send"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBtnText: {
    fontFamily,
    fontWeight: fontWeight.heavy,
    color: colors.text,
  },
});
