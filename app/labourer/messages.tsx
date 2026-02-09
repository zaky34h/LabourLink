import { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getThreadsForUser, type ChatThread } from "../../src/chat/storage";
import { getUserByEmail } from "../../src/auth/storage";

export default function LabourerMessages() {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  async function load() {
    if (!user?.email) {
      setThreads([]);
      setNames({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = await getThreadsForUser(user.email);
    setThreads(t);

    const map: Record<string, string> = {};
    for (const th of t) {
      const u = await getUserByEmail(th.peerEmail);
      map[th.peerEmail] = u ? `${u.firstName} ${u.lastName}` : th.peerEmail;
    }
    setNames(map);

    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.email])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Messages</Text>

      <FlatList
        style={{ marginTop: 14 }}
        data={threads}
        keyExtractor={(t) => t.threadId}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ marginTop: 26, opacity: 0.7, fontWeight: "700" }}>
            No chats yet. A builder will message you once they’re interested.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${encodeURIComponent(item.peerEmail)}`)}
            style={{
              padding: 14,
              borderRadius: 16,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#111111",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 16 }}>
              {names[item.peerEmail] ?? item.peerEmail}
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.75 }} numberOfLines={1}>
              {item.lastMessageText}
            </Text>
            <Text style={{ marginTop: 8, opacity: 0.6, fontSize: 12 }}>
              {new Date(item.lastMessageAt).toLocaleString()}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
