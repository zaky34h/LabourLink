import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getThreadsForUser } from "../../src/chat/storage";
import { getOffersForLabourer, type WorkOffer } from "../../src/offers/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

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
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.xl, paddingTop: 60, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
      <View style={{ gap: 6 }}>
        <Text style={{ ...type.secondary, fontWeight: fontWeight.bold }}>
          Welcome back,
        </Text>
        <Text style={type.display} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard title="Active Chats" value={String(activeChats)} />
        <StatCard title="Pending Offers" value={String(pendingOffers)} />
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard title="Approved Offers" value={String(approvedOffers)} />
        <StatCard title="Unavailabilities" value={String(unavailableCount)} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={{ ...type.h3, fontWeight: fontWeight.heavy }}>Quick Actions</Text>

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
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontFamily, fontSize: fontSize.h1, fontWeight: fontWeight.heavy, color: colors.text }}>
        {value}
      </Text>
      <Text style={{ ...type.secondary, marginTop: 6, fontWeight: fontWeight.bold }}>{title}</Text>
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
  const highlighted = tone === "yellow";
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: highlighted ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: highlighted ? colors.primary : colors.border,
        padding: spacing.lg,
        borderRadius: radii.xl,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.heavy,
          color: highlighted ? colors.onPrimary : colors.text,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily,
          fontSize: fontSize.label,
          fontWeight: fontWeight.medium,
          marginTop: 4,
          color: highlighted ? colors.onPrimary : colors.textSecondary,
          opacity: highlighted ? 0.85 : 1,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}
