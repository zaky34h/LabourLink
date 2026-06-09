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
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { getUserByEmail, isManagedLabourerEmail, type LabourerUser } from "../../src/auth/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

// How many messages to render at first; older ones load on demand.
const PAGE_SIZE = 30;
// Resend typing=true at least this often so the server's 10s freshness
// window never expires mid-typing; stop after the same idle gap.
const TYPING_HEARTBEAT_MS = 4000;

/** Animated three-dot "typing" bubble, styled like an incoming message. */
function TypingBubble() {
  const dots = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={{ marginBottom: spacing.sm, alignItems: "flex-start" }}>
      <View style={styles.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

export default function ChatWithPeer() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const peerEmail = decodeURIComponent(email ?? "");
  const { user } = useCurrentUser();
  const insets = useSafeAreaInsets();

  // Managed labourers can't be messaged directly. Seed from the synthetic-email
  // suffix so we NEVER flash the thread (or the synthetic email) before the peer
  // record loads; the agency name is filled in once the peer is fetched.
  const initialManaged = isManagedLabourerEmail(peerEmail);
  const [peerName, setPeerName] = useState<string>(initialManaged ? "Labourer" : peerEmail);
  const [peerManaged, setPeerManaged] = useState(initialManaged);
  const [peerAgencyName, setPeerAgencyName] = useState<string | undefined>(undefined);
  const peerManagedRef = useRef(initialManaged);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const hasLoadedRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const lastTypingSentRef = useRef(false);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadErrorShownRef = useRef(false);

  async function load() {
    if (!user?.email) return;
    // Never fetch a message thread for an agency-managed labourer.
    if (peerManagedRef.current) return;
    // Only show the full-screen loader on the very first load — never on a poll.
    if (!hasLoadedRef.current && !refreshing) setLoadingMessages(true);
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
      setPeerTyping(typing.peerTyping);
      loadErrorShownRef.current = false;
      await markThreadRead(peerEmail);
    } catch (error: any) {
      if (!loadErrorShownRef.current) {
        Alert.alert("Couldn’t load chat", error?.message || "Please try again.");
        loadErrorShownRef.current = true;
      }
    } finally {
      hasLoadedRef.current = true;
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    async function loadPeerName() {
      const peer = await getUserByEmail(peerEmail);
      if (!peer) return;
      setPeerName(`${peer.firstName} ${peer.lastName}`);
      const managed = peer.role === "labourer" && !!(peer as LabourerUser).agencyManaged;
      if (managed || isManagedLabourerEmail(peerEmail)) {
        peerManagedRef.current = true;
        setPeerManaged(true);
        if (peer.role === "labourer") setPeerAgencyName((peer as LabourerUser).agencyName);
      }
    }
    void loadPeerName();
  }, [peerEmail]);

  useEffect(() => {
    // New thread context: reset the loaded/scroll state so the loader shows.
    hasLoadedRef.current = false;
    stickToBottomRef.current = true;
    setLoadingMessages(true);
    load();
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, peerEmail]);

  function sendTyping(value: boolean) {
    if (!user?.email) return;
    if (lastTypingSentRef.current === value) return;
    lastTypingSentRef.current = value;
    void setTypingStatus(peerEmail, value);
  }

  function stopHeartbeat() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  // Typing presence: debounce keystrokes, then keep the server row fresh with a
  // heartbeat while typing and auto-stop after an idle gap.
  useEffect(() => {
    const typing = text.trim().length > 0;

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);

    typingDebounceRef.current = setTimeout(() => {
      if (!typing) {
        sendTyping(false);
        stopHeartbeat();
        return;
      }

      sendTyping(true);

      if (!heartbeatRef.current) {
        heartbeatRef.current = setInterval(() => {
          if (user?.email) void setTypingStatus(peerEmail, true);
        }, TYPING_HEARTBEAT_MS);
      }

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        sendTyping(false);
        stopHeartbeat();
      }, TYPING_HEARTBEAT_MS);
    }, 250);

    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, peerEmail, user?.email]);

  // On unmount, clear timers and clear our typing flag for the peer.
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (lastTypingSentRef.current) setTypingStatus(peerEmail, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerEmail]);

  const myEmail = user?.email ?? "";

  const visibleMessages = useMemo(
    () => (messages.length <= visibleCount ? messages : messages.slice(messages.length - visibleCount)),
    [messages, visibleCount]
  );
  const hasOlderMessages = messages.length > visibleCount;

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
    stickToBottomRef.current = true;
    setMessages((current) => [...current, optimisticMessage].sort((a, b) => a.createdAt - b.createdAt));
    setText("");
    stopHeartbeat();
    lastTypingSentRef.current = false;
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

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

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    // Only auto-stick to the bottom when the user is already near it.
    stickToBottomRef.current = distanceFromBottom < 120;
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

  const canSend = !sending && text.trim().length > 0;
  const showInitialLoader = loadingMessages && !hasLoadedRef.current;

  // Backstop: a managed-labourer chat is never rendered as a thread. We show an
  // agency note instead of messages — and never the synthetic email.
  if (peerManaged) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }}
              numberOfLines={1}
            >
              {peerName}
            </Text>
          </View>
        </View>
        <View style={[styles.centered, { padding: spacing.xl, gap: spacing.sm }]}>
          <Text style={{ ...type.h3, textAlign: "center" }}>
            Coordinated by {peerAgencyName || "their agency"}
          </Text>
          <Text style={{ ...type.secondary, textAlign: "center" }}>
            This labourer is managed by an agency. Send a work offer to book them — there&rsquo;s no
            direct messaging.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Back</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }}
              numberOfLines={1}
            >
              {peerName}
            </Text>
            <Text style={type.secondary} numberOfLines={1}>
              {peerEmail}
            </Text>
            {peerTyping ? (
              <Text
                style={{
                  fontFamily,
                  marginTop: 2,
                  color: colors.pendingText,
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.caption,
                }}
              >
                Typing…
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onCloseChat} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { fontSize: fontSize.caption }]}>Close Chat</Text>
          </Pressable>
        </View>

        {/* Messages */}
        {showInitialLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.text} />
            <Text style={{ ...type.secondary, marginTop: spacing.md }}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={visibleMessages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              flexGrow: 1,
            }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onScroll={onScroll}
            scrollEventThrottle={100}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            ListHeaderComponent={
              hasOlderMessages ? (
                <Pressable
                  onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  style={styles.loadEarlierBtn}
                >
                  <Text style={styles.loadEarlierText}>Load earlier messages</Text>
                </Pressable>
              ) : null
            }
            onContentSizeChange={() => {
              if (stickToBottomRef.current) listRef.current?.scrollToEnd({ animated: false });
            }}
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
                    <Text
                      style={{ fontFamily, color: mine ? colors.onPrimary : colors.text, fontWeight: fontWeight.medium }}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={{
                        fontFamily,
                        color: mine ? colors.onPrimary : colors.textSecondary,
                        marginTop: 6,
                        fontSize: fontSize.caption,
                        opacity: mine ? 0.8 : 1,
                      }}
                    >
                      {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={peerTyping ? <TypingBubble /> : null}
            ListEmptyComponent={
              <View style={{ paddingTop: 40 }}>
                <Text style={{ ...type.secondary, textAlign: "center" }}>No messages yet. Say hello 👋</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View
          style={{
            padding: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message…"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={{
                flex: 1,
                maxHeight: 120,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.lg,
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 12,
                backgroundColor: colors.field,
                fontFamily,
                fontSize: fontSize.body,
                color: colors.text,
              }}
            />
            <Pressable
              onPress={onSend}
              disabled={!canSend}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: radii.lg,
                backgroundColor: colors.primary,
                opacity: canSend ? 1 : 0.45,
              }}
            >
              <Text style={{ fontFamily, color: colors.onPrimary, fontWeight: fontWeight.heavy }}>
                {sending ? "Sending…" : "Send"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadEarlierBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadEarlierText: {
    fontFamily,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  typingBubble: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.textSecondary,
  },
});
