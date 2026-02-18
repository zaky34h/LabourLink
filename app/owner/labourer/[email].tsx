import { useCallback, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { type LabourerUser, getUserByEmail } from "../../../src/auth/storage";
import { useCurrentUser } from "../../../src/auth/useCurrentUser";

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
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={{ fontWeight: "800" }}>Back</Text>
      </Pressable>

      <Text style={{ fontSize: 24, fontWeight: "900" }}>Labourer Profile</Text>

      {!labourer ? (
        <View style={{ borderWidth: 1, borderColor: "#111", borderRadius: 12, padding: 14 }}>
          <Text style={{ fontWeight: "700" }}>Labourer not found</Text>
          <Text style={{ opacity: 0.7, marginTop: 4 }}>{labourerEmail || "Missing email parameter."}</Text>
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
            <Text style={{ opacity: 0.85 }}>{labourer.about || "No about text."}</Text>
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
    <View style={{ borderWidth: 1, borderColor: "#111", borderRadius: 12, padding: 12, gap: 8 }}>
      <Text style={{ fontWeight: "900" }}>{props.title}</Text>
      {props.children}
    </View>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontWeight: "700", opacity: 0.7 }}>{props.label}</Text>
      <Text style={{ fontWeight: "500" }}>{props.value}</Text>
    </View>
  );
}
