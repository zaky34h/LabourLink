import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getThreadsForUser, type ChatThread } from "../../src/chat/storage";
import { getUserByEmail } from "../../src/auth/storage";

export default function BuilderMessages() {
  const { user, loading: userLoading } = useCurrentUser();
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"active" | "history">("active");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load(options?: { silent?: boolean; view?: "active" | "history" }) {
    const silent = options?.silent ?? false;
    const view = options?.view ?? selectedTab;
    if (userLoading) return;
    if (!user?.email) {
      setThreads([]);
      setNames({});
      setError("You are not logged in. Please sign in to see your chats.");
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const t = await getThreadsForUser(user.email, view);
      setThreads(t);

      const uniquePeers = Array.from(new Set(t.map((th) => th.peerEmail)));
      const peerUsers = await Promise.all(uniquePeers.map((peerEmail) => getUserByEmail(peerEmail)));
      const map: Record<string, string> = {};
      uniquePeers.forEach((peerEmail, idx) => {
        const u = peerUsers[idx];
        map[peerEmail] = u ? `${u.firstName} ${u.lastName}` : peerEmail;
      });
      setNames(map);
      setError(null);
      loadedRef.current = true;
    } catch (err: any) {
      setThreads([]);
      setNames({});
      setError(err?.message || "Could not load chats.");
    }

    if (!silent) setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      if (userLoading) return;
      void load({ silent: loadedRef.current });
    }, [user?.email, userLoading])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 }}
      data={threads}
      keyExtractor={(t) => t.threadId}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        <View>
          <Text style={{ fontSize: 24, fontWeight: "900" }}>Messages</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={async () => {
                if (selectedTab === "active") return;
                setSelectedTab("active");
                await load({ silent: true, view: "active" });
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111111",
                backgroundColor: selectedTab === "active" ? "#111111" : "#ffffff",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  color: selectedTab === "active" ? "#FDE047" : "#111111",
                }}
              >
                Active
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                if (selectedTab === "history") return;
                setSelectedTab("history");
                await load({ silent: true, view: "history" });
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111111",
                backgroundColor: selectedTab === "history" ? "#111111" : "#ffffff",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  color: selectedTab === "history" ? "#FDE047" : "#111111",
                }}
              >
                History
              </Text>
            </Pressable>
          </View>
          {error ? (
            <Text style={{ marginTop: 8, color: "#B91C1C", fontWeight: "700" }}>{error}</Text>
          ) : null}
          <View style={{ height: 14 }} />
        </View>
      }
      ListEmptyComponent={
        <Text style={{ marginTop: 26, opacity: 0.7, fontWeight: "700" }}>
          {selectedTab === "active"
            ? "No active chats yet. Browse labourers and message one."
            : "No chat history yet."}
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
  );
}
