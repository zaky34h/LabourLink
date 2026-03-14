import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { clearSession } from "../../src/auth/storage";
import { getOwnerOverview, type OwnerOverview } from "../../src/owner/storage";

const BRAND_YELLOW = "#FDE047";
const BRAND_YELLOW_SOFT = "#FEF9C3";

const EMPTY_OVERVIEW: OwnerOverview = {
  buildersSignedUp: 0,
  labourersSignedUp: 0,
  workOffersSent: 0,
  totalUsers: 0,
};

export default function OwnerHome() {
  const { user } = useCurrentUser();
  const [overview, setOverview] = useState<OwnerOverview>(EMPTY_OVERVIEW);
  const [refreshing, setRefreshing] = useState(false);

  async function loadOverview() {
    try {
      const data = await getOwnerOverview();
      setOverview(data);
    } catch (error: any) {
      Alert.alert("Could not load owner dashboard", error?.message || "Please try again.");
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadOverview();
    setRefreshing(false);
  }

  async function onLogout() {
    await clearSession();
    router.replace("/");
  }

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      if (user.role !== "owner") {
        router.replace("/");
        return;
      }
      loadOverview();
    }, [user?.email, user?.role])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 14 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <Text style={{ fontSize: 28, fontWeight: "900" }}>Owner Portal</Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Builders Signed Up" value={overview.buildersSignedUp} />
        <StatCard label="Labourers Signed Up" value={overview.labourersSignedUp} />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Work Offers Sent" value={overview.workOffersSent} />
        <StatCard label="Total Users" value={overview.totalUsers} />
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Quick Actions</Text>
        <QuickButton
          label="View Builders"
          subtitle="Review builder accounts"
          tone="default"
          onPress={() => router.push("/owner/builders")}
        />
        <QuickButton
          label="View Labourers"
          subtitle="Review labourer accounts"
          tone="yellow"
          onPress={() => router.push("/owner/labourers")}
        />
        <QuickButton
          label="Open Reports"
          subtitle="Export owner platform reports"
          tone="default"
          onPress={() => router.push("/owner/reports")}
        />
        <QuickButton
          label="Open Support"
          subtitle="Manage support actions"
          tone="yellow"
          onPress={() => router.push("/owner/support")}
        />
      </View>

      <Pressable
        onPress={onLogout}
        style={{
          marginTop: 4,
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#111111",
          backgroundColor: BRAND_YELLOW,
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "900" }}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: "#111111",
        borderRadius: 16,
        backgroundColor: "#fff",
        padding: 14,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "900" }}>{value}</Text>
      <Text style={{ marginTop: 6, opacity: 0.75, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function QuickButton({
  label,
  subtitle,
  onPress,
  tone,
}: {
  label: string;
  subtitle: string;
  onPress: () => void;
  tone: "default" | "yellow";
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
          fontWeight: "900",
          fontSize: 16,
          color: isYellow ? "#333333" : BRAND_YELLOW,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontWeight: "600",
          color: isYellow ? "#444444" : BRAND_YELLOW,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}
