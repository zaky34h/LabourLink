import { useCallback, useState, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { type BuilderUser, getUserByEmail } from "../../../src/auth/storage";
import { useCurrentUser } from "../../../src/auth/useCurrentUser";

export default function OwnerBuilderDetails() {
  const params = useLocalSearchParams<{ email?: string }>();
  const builderEmail = decodeURIComponent(String(params.email || "")).trim().toLowerCase();
  const { user } = useCurrentUser();

  const [builder, setBuilder] = useState<BuilderUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadBuilder() {
    if (!builderEmail) return;
    try {
      const next = await getUserByEmail(builderEmail);
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
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={{ fontWeight: "800" }}>Back</Text>
      </Pressable>

      <Text style={{ fontSize: 24, fontWeight: "900" }}>Builder Profile</Text>

      {!builder ? (
        <View style={{ borderWidth: 1, borderColor: "#111", borderRadius: 12, padding: 14 }}>
          <Text style={{ fontWeight: "700" }}>Builder not found</Text>
          <Text style={{ opacity: 0.7, marginTop: 4 }}>{builderEmail || "Missing email parameter."}</Text>
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

          <Card title="Bio">
            <Text style={{ opacity: 0.85 }}>{builder.about || "No about text."}</Text>
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
