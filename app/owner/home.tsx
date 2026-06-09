import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { clearSession } from "../../src/auth/storage";
import { getOwnerOverview, type OwnerOverview } from "../../src/owner/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

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
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingTop: 60, gap: spacing.lg }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
      <Text style={type.display}>Owner Portal</Text>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard label="Companies Signed Up" value={overview.buildersSignedUp} />
        <StatCard label="Labourers Signed Up" value={overview.labourersSignedUp} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard label="Work Offers Sent" value={overview.workOffersSent} />
        <StatCard label="Total Users" value={overview.totalUsers} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={{ ...type.h3, fontWeight: fontWeight.heavy }}>Quick Actions</Text>
        <QuickButton
          label="View Companies"
          subtitle="Review company accounts"
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

      <Button label="Logout" variant="destructive" onPress={onLogout} style={{ marginTop: spacing.xs }} />
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.xl,
        backgroundColor: colors.surface,
        padding: spacing.lg,
      }}
    >
      <Text style={{ fontFamily, fontSize: fontSize.h1, fontWeight: fontWeight.heavy, color: colors.text }}>
        {value}
      </Text>
      <Text style={{ ...type.secondary, marginTop: 6, fontWeight: fontWeight.bold }}>{label}</Text>
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
