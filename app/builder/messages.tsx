import { memo, useCallback, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getThreadsForUser, type ChatThread } from "../../src/chat/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import { Skeleton, SkeletonList } from "../../src/ui/Skeleton";

const ThreadRow = memo(function ThreadRow({ item }: { item: ChatThread }) {
  return (
    <Pressable
      onPress={() => router.push(`/chat/${encodeURIComponent(item.peerEmail)}`)}
      style={styles.card}
    >
      <Text style={styles.rowName}>{item.peerName ?? item.peerEmail}</Text>
      <Text style={styles.rowPreview} numberOfLines={1}>
        {item.lastMessageText}
      </Text>
      <Text style={styles.rowTime}>{new Date(item.lastMessageAt).toLocaleString()}</Text>
    </Pressable>
  );
});

function renderThread({ item }: { item: ChatThread }) {
  return <ThreadRow item={item} />;
}

export default function BuilderMessages() {
  const { user, loading: userLoading } = useCurrentUser();
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"active" | "history">("active");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(options?: { silent?: boolean; view?: "active" | "history" }) {
    const silent = options?.silent ?? false;
    const view = options?.view ?? selectedTab;
    if (userLoading) return;
    if (!user?.email) {
      setThreads([]);
      setError("You are not logged in. Please sign in to see your chats.");
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const t = await getThreadsForUser(user.email, view);
      setThreads(t);
      setError(null);
      loadedRef.current = true;
    } catch (err: any) {
      setThreads([]);
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
      <View style={styles.skeletonWrap}>
        <Skeleton width={140} height={28} />
        <Skeleton width="100%" height={44} radius={radii.lg} style={styles.skeletonSegment} />
        <SkeletonList count={6} lines={2} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 }}
      data={threads}
      keyExtractor={(t) => t.threadId}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={11}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        <View>
          <Text style={type.h1}>Messages</Text>

          <View style={styles.segment}>
            <Pressable
              onPress={async () => {
                if (selectedTab === "active") return;
                setSelectedTab("active");
                await load({ silent: true, view: "active" });
              }}
              style={[styles.segmentItem, selectedTab === "active" && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentLabel, { color: selectedTab === "active" ? colors.onPrimary : colors.textSecondary }]}>
                Active
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                if (selectedTab === "history") return;
                setSelectedTab("history");
                await load({ silent: true, view: "history" });
              }}
              style={[styles.segmentItem, selectedTab === "history" && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentLabel, { color: selectedTab === "history" ? colors.onPrimary : colors.textSecondary }]}>
                History
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ height: spacing.md }} />
        </View>
      }
      ListEmptyComponent={
        <Text style={{ ...type.secondary, marginTop: 26, lineHeight: 20 }}>
          {selectedTab === "active"
            ? "No active chats yet. Browse labourers and message one."
            : "No chat history yet."}
        </Text>
      }
      renderItem={renderThread}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  skeletonWrap: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingHorizontal: spacing.lg },
  skeletonSegment: { marginTop: spacing.md, marginBottom: spacing.lg },
  rowName: { fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.h3, color: colors.text },
  rowPreview: { ...type.secondary, marginTop: 6 },
  rowTime: { ...type.secondary, marginTop: 8, fontSize: fontSize.caption },
  segment: {
    flexDirection: "row",
    marginTop: spacing.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.md,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    fontFamily,
    fontWeight: fontWeight.heavy,
    fontSize: fontSize.body,
  },
  error: {
    fontFamily,
    marginTop: spacing.sm,
    color: colors.dangerText,
    fontWeight: fontWeight.bold,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
});
