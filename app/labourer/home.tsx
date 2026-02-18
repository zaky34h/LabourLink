import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getThreadsForUser } from "../../src/chat/storage";
import { getOffersForLabourer, type WorkOffer } from "../../src/offers/storage";

export default function LabourerHome() {
  const { user } = useCurrentUser();
  const [activeChats, setActiveChats] = useState(0);
  const [pendingOffers, setPendingOffers] = useState(0);
  const [approvedOffers, setApprovedOffers] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const name = user ? `${user.firstName} ${user.lastName}` : "Welcome";
  const unavailableCount = user?.role === "labourer" ? user.unavailableDates?.length ?? 0 : 0;

  async function loadStats() {
    if (!user?.email || user.role !== "labourer") {
      setActiveChats(0);
      setPendingOffers(0);
      setApprovedOffers(0);
      return;
    }

    const [threads, offers] = await Promise.all([
      getThreadsForUser(user.email),
      getOffersForLabourer(user.email),
    ]);

    setActiveChats(threads.length);
    const pending = offers.filter((o: WorkOffer) => o.status === "pending").length;
    const approved = offers.filter((o: WorkOffer) => o.status === "approved").length;
    setPendingOffers(pending);
    setApprovedOffers(approved);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;

      async function runLoad() {
        await loadStats();
        if (isCancelled) return;
      }

      runLoad();
      return () => {
        isCancelled = true;
      };
    }, [user?.email, user?.role])
  );

  return (
    <ScrollView
        style={{ flex: 1, backgroundColor: "#fff" }}
        contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111111" }}>
          Welcome back,
        </Text>
        <Text style={{ fontSize: 28, fontWeight: "900" }} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Active Chats" value={String(activeChats)} />
        <StatCard title="Pending Offers" value={String(pendingOffers)} />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Approved Offers" value={String(approvedOffers)} />
        <StatCard title="Unavailabilities" value={String(unavailableCount)} />
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Quick Actions</Text>

        <ActionButton
          label="Messages"
          subtitle="Open your builder conversations"
          onPress={() => router.push("/labourer/messages")}
        />

        <ActionButton
          label="Offers"
          subtitle="Review, sign and approve work offers"
          onPress={() => router.push("/labourer/offers")}
          tone="yellow"
        />

        <ActionButton
          label="Availability"
          subtitle="Update your schedule for upcoming jobs"
          onPress={() => router.push("/labourer/schedule")}
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#111111",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "900" }}>{value}</Text>
      <Text style={{ marginTop: 6, opacity: 0.7, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}

function ActionButton({
  label,
  subtitle,
  onPress,
  tone,
}: {
  label: string;
  subtitle: string;
  onPress: () => void;
  tone?: "default" | "yellow";
}) {
  const isYellow = tone === "yellow";
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: isYellow ? "#FDE047" : "#111",
        padding: 16,
        borderRadius: 16,
      }}
    >
      <Text
        style={{
          color: isYellow ? "#333333" : "#FDE047",
          fontWeight: "900",
          fontSize: 16,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: isYellow ? "#444444" : "#FDE047",
          marginTop: 4,
          fontWeight: "600",
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}
