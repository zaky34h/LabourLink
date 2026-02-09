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
import { getMessagesWithPeer, sendMessage, type ChatMessage } from "../../src/chat/storage";
import { getUserByEmail } from "../../src/auth/storage";

export default function ChatWithPeer() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const peerEmail = decodeURIComponent(email ?? "");
  const { user } = useCurrentUser();

  const [peerName, setPeerName] = useState<string>(peerEmail);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function load() {
    if (!user?.email) return;
    const msgs = await getMessagesWithPeer(user.email, peerEmail);
    setMessages(msgs);

    const peer = await getUserByEmail(peerEmail);
    if (peer) setPeerName(`${peer.firstName} ${peer.lastName}`);
  }

  useEffect(() => {
    load();
    // (local-only) refresh when returning
  }, [user?.email, peerEmail]);

  const myEmail = user?.email ?? "";

  const grouped = useMemo(() => messages, [messages]);

  async function onSend() {
    if (!user?.email) return;

    const res = await sendMessage(user.email, peerEmail, text);
    if (!res.ok) return Alert.alert("Can’t send", res.error);

    setText("");
    await load();

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
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
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={grouped}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
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
                <Text style={{ color: mine ? "#111111" : "#333333", marginTop: 6, fontSize: 11 }}>
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
