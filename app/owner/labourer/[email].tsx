import { useCallback, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Alert, RefreshControl, StyleSheet } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { type LabourerUser, getUserByEmail } from "../../../src/auth/storage";
import { useCurrentUser } from "../../../src/auth/useCurrentUser";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../../src/theme";

export default function OwnerLabourerDetails() {
  const params = useLocalSearchParams<{ email?: string }>();
  const labourerEmail = decodeURIComponent(String(params.email || "")).trim().toLowerCase();
  const { user } = useCurrentUser();

  const [labourer, setLabourer] = useState<LabourerUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadLabourer() {
    if (!labourerEmail) return;
    try {
      const next = await getUserByEmail(labourerEmail);
      if (!next || next.role !== "labourer") {
        setLabourer(null);
        return;
      }
      setLabourer(next as LabourerUser);
    } catch (error: any) {
      Alert.alert("Could not load labourer", error?.message || "Please try again.");
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadLabourer();
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      if (user.role !== "owner") {
        router.replace("/");
        return;
      }
      void loadLabourer();
    }, [user?.email, user?.role, labourerEmail])
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

      <Text style={type.h1}>Labourer Profile</Text>

      {!labourer ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Labourer not found</Text>
          <Text style={{ ...type.secondary, marginTop: 4 }}>{labourerEmail || "Missing email parameter."}</Text>
        </View>
      ) : (
        <>
          <Card title="Identity">
            <Row label="Name" value={`${labourer.firstName} ${labourer.lastName}`} />
            <Row label="Email" value={labourer.email} />
            <Row label="Disabled" value={labourer.isDisabled ? "Yes" : "No"} />
          </Card>

          <Card title="Work Profile">
            <Row label="Rate" value={`$${labourer.pricePerHour}/hr`} />
            <Row label="Experience" value={`${labourer.experienceYears} years`} />
            <Row label="Certifications" value={labourer.certifications?.join(", ") || "None"} />
            <Row label="Unavailable Days" value={String(labourer.unavailableDates?.length ?? 0)} />
          </Card>

          <Card title="Bio">
            <Text style={type.secondary}>{labourer.about || "No about text."}</Text>
          </Card>

          <Card title="Payment Details">
            <Row label="BSB" value={labourer.bsb || "-"} />
            <Row label="Account Number" value={labourer.accountNumber || "-"} />
          </Card>

          <Card title="Subscription">
            <Row label="Plan" value={labourer.subscription?.planName || "-"} />
            <Row label="Status" value={labourer.subscription?.status || "-"} />
            <Row label="Price" value={`$${labourer.subscription?.monthlyPrice ?? 0}/mo`} />
            <Row label="Renewal Date" value={labourer.subscription?.renewalDate || "-"} />
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
