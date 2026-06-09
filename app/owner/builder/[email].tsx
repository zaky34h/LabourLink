import { useCallback, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Alert, RefreshControl, StyleSheet } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { type BuilderUser } from "../../../src/auth/storage";
import { getOwnerUserByEmail } from "../../../src/owner/storage";
import { useCurrentUser } from "../../../src/auth/useCurrentUser";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../../src/theme";

export default function OwnerBuilderDetails() {
  const params = useLocalSearchParams<{ email?: string }>();
  const builderEmail = decodeURIComponent(String(params.email || "")).trim().toLowerCase();
  const { user } = useCurrentUser();

  const [builder, setBuilder] = useState<BuilderUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadBuilder() {
    if (!builderEmail) return;
    try {
      const next = await getOwnerUserByEmail(builderEmail);
      if (!next || next.role !== "builder") {
        setBuilder(null);
        return;
      }
      setBuilder(next as BuilderUser);
    } catch (error: any) {
      Alert.alert("Could not load builder", error?.message || "Please try again.");
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadBuilder();
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      if (user.role !== "owner") {
        router.replace("/");
        return;
      }
      void loadBuilder();
    }, [user?.email, user?.role, builderEmail])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: 60, gap: spacing.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Pressable onPress={() => router.back()} style={styles.headerBtn}>
        <Text style={styles.headerBtnText}>Back</Text>
      </Pressable>

      <Text style={type.h1}>Builder Profile</Text>

      {!builder ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Builder not found</Text>
          <Text style={{ ...type.secondary, marginTop: 4 }}>{builderEmail || "Missing email parameter."}</Text>
        </View>
      ) : (
        <>
          <Card title="Identity">
            <Row label="Name" value={`${builder.firstName} ${builder.lastName}`} />
            <Row label="Email" value={builder.email} />
            <Row label="Disabled" value={builder.isDisabled ? "Yes" : "No"} />
          </Card>

          <Card title="Company">
            <Row label="Company" value={builder.companyName || "-"} />
            <Row label="Address" value={builder.address || "-"} />
            <Row label="Company Rating" value={String(builder.companyRating ?? 0)} />
            <Row label="Reviews" value={String(builder.reviews?.length ?? 0)} />
          </Card>

          <Card title="Subscription">
            <Row label="Plan" value={builder.subscription?.planName || "-"} />
            <Row label="Status" value={builder.subscription?.status || "-"} />
            <Row label="Price" value={`$${builder.subscription?.monthlyPrice ?? 0}/mo`} />
            <Row label="Renewal Date" value={builder.subscription?.renewalDate || "-"} />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Card(props: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={styles.rowLabel}>{props.label}</Text>
      <Text style={styles.rowValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    alignSelf: "flex-start",
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontFamily,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.heavy,
    color: colors.text,
  },
  rowLabel: {
    fontFamily,
    fontSize: fontSize.eyebrow,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  rowValue: {
    fontFamily,
    fontSize: fontSize.h3,
    color: colors.text,
  },
});
