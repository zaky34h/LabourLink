import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getSavedLabourers, unsaveLabourer } from "../../src/saved-labourers/storage";
import type { LabourerUser } from "../../src/auth/storage";

export default function BuilderSavedLabourers() {
  const { user } = useCurrentUser();
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [labourers, setLabourers] = useState<LabourerUser[]>([]);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const list = await getSavedLabourers();
      setLabourers(list);
      loadedRef.current = true;
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }

  async function onUnsave(email: string) {
    setBusyEmail(email);
    try {
      await unsaveLabourer(email);
      setLabourers((prev) => prev.filter((x) => x.email !== email));
    } catch (error: any) {
      Alert.alert("Couldn’t remove", error?.message || "Please try again.");
    } finally {
      setBusyEmail(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load({ silent: loadedRef.current });
    }, [user?.email])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 }}
      data={labourers}
      keyExtractor={(item) => item.email}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        <View>
          <Text style={{ fontSize: 24, fontWeight: "900" }}>Saved Labourers</Text>
          <Text style={{ marginTop: 8, opacity: 0.75, fontWeight: "700" }}>
            Star labourers on their profile to save them here.
          </Text>
          <View style={{ height: 12 }} />
        </View>
      }
      ListEmptyComponent={
        <Text style={{ marginTop: 24, opacity: 0.7, fontWeight: "700" }}>
          No saved labourers yet.
        </Text>
      }
      renderItem={({ item }) => (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#111111",
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 16 }}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.8, fontWeight: "700" }}>{item.occupation}</Text>
          <Text style={{ marginTop: 4, opacity: 0.75 }}>${item.pricePerHour}/hr</Text>

          <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => router.push(`/builder/labourer/${encodeURIComponent(item.email)}`)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: "#111",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FDE047", fontWeight: "900" }}>View</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/chat/${encodeURIComponent(item.email)}`)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111111",
                alignItems: "center",
                backgroundColor: "#FEF08A",
              }}
            >
              <Text style={{ fontWeight: "900" }}>Message</Text>
            </Pressable>
            <Pressable
              disabled={busyEmail === item.email}
              onPress={() => onUnsave(item.email)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111111",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fff",
                opacity: busyEmail === item.email ? 0.6 : 1,
              }}
            >
              <Text style={{ fontWeight: "900" }}>{busyEmail === item.email ? "..." : "Unsave"}</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}
