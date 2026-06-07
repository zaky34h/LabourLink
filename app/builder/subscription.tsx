import { useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

const defaultSubscription = {
  planName: "Starter",
  status: "trial",
  monthlyPrice: 0,
  renewalDate: null as string | null,
};

export default function BuilderSubscription() {
  const { user, loading, reload } = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!user || user.role !== "builder") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 60 }}>
        <Text style={type.h2}>No builder account</Text>
        <Text style={{ ...type.secondary, marginTop: 6 }}>
          Log in as a builder to see subscription details.
        </Text>
      </View>
    );
  }

  const sub = user.subscription ?? defaultSubscription;
  const renewalLabel = sub.renewalDate
    ? new Date(sub.renewalDate).toLocaleDateString()
    : "No renewal set";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingTop: 60, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={type.h1}>Subscription</Text>

      <View style={styles.card}>
        <Row label="Plan" value={sub.planName} />
        <Row label="Status" value={sub.status.replace("_", " ")} />
        <Row
          label="Billing"
          value={sub.monthlyPrice > 0 ? `$${sub.monthlyPrice}/month` : "Free"}
        />
        <Row label="Renewal" value={renewalLabel} />
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
      <Text style={{ ...type.secondary, fontWeight: fontWeight.bold }}>{label}</Text>
      <Text style={{ fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.heavy, color: colors.text, textTransform: "capitalize" }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
