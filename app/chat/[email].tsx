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

export default function ChatWithPeer() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const peerEmail = decodeURIComponent(email ?? "");
  const { user } = useCurrentUser();

  const [peerName, setPeerName] = useState<string>(peerEmail);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [meTyping, setMeTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastTypingSentRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadErrorShownRef = useRef(false);

  async function load() {
    if (!user?.email) return;
    try {
      const [msgs, typing] = await Promise.all([
        getMessagesWithPeer(user.email, peerEmail),
        getTypingStatus(peerEmail),
      ]);
      setMessages(msgs);
      setMeTyping(typing.meTyping);
      setPeerTyping(typing.peerTyping);
      loadErrorShownRef.current = false;
      await markThreadRead(peerEmail);
    } catch (error: any) {
      if (!loadErrorShownRef.current) {
        Alert.alert("Couldn’t load chat", error?.message || "Please try again.");
        loadErrorShownRef.current = true;
      }
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
    if (!user?.email) return;

    const res = await sendMessage(user.email, peerEmail, text);
    if (!res.ok) return Alert.alert("Can’t send", res.error);

    setText("");
    setMeTyping(false);
    lastTypingSentRef.current = false;
    await setTypingStatus(peerEmail, false);
    await load();

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
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
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Messages */}
      <FlatList
        ref={listRef}
        data={grouped}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 60, flexGrow: 1 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.back()} style={{ padding: 10, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#111111" }}>
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }} numberOfLines={1}>
                {peerName}
              </Text>
              <Text style={{ opacity: 0.65 }} numberOfLines={1}>
                {peerEmail}
              </Text>
              {peerTyping ? (
                <Text style={{ marginTop: 2, color: "#B45309", fontWeight: "700", fontSize: 12 }}>
                  Typing...
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onCloseChat}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111111",
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 12 }}>Close Chat</Text>
            </Pressable>
          </View>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.from.toLowerCase() === myEmail.toLowerCase();
          return (
            <View style={{ marginBottom: 10, alignItems: mine ? "flex-end" : "flex-start" }}>
              <View
                style={{
                  maxWidth: "80%",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: mine ? "#111" : "#FEF08A",
                  borderWidth: mine ? 0 : 1,
                  borderColor: "#111111",
                }}
              >
                <Text style={{ color: mine ? "#FDE047" : "#111", fontWeight: "700" }}>
                  {item.text}
                </Text>
                <Text style={{ color: mine ? "#FDE047" : "#333333", marginTop: 6, fontSize: 11 }}>
                  {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <Text style={{ textAlign: "center", opacity: 0.7, fontWeight: "700" }}>
              No messages yet. Say hello 👋
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={{ padding: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: "#111111", backgroundColor: "#fff" }}>
        {meTyping ? (
          <Text style={{ marginBottom: 8, opacity: 0.65, fontWeight: "700", fontSize: 12 }}>
            You are typing...
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: "#fff",
              fontWeight: "600",
            }}
          />
          <Pressable
            onPress={onSend}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: "#111",
            }}
          >
            <Text style={{ color: "#FDE047", fontWeight: "900" }}>Send</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
