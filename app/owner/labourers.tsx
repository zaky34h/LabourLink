import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { type LabourerUser } from "../../src/auth/storage";
import { getOwnerLabourers } from "../../src/owner/storage";

export default function OwnerLabourers() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [labourers, setLabourers] = useState<LabourerUser[]>([]);

  async function load() {
    try {
      const rows = await getOwnerLabourers();
      setLabourers(rows);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 24 }}
      data={labourers}
      keyExtractor={(item) => item.email}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: "900" }}>All Labourers</Text>
          <Text style={{ opacity: 0.75 }}>Total: {labourers.length}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/owner/labourer/${encodeURIComponent(item.email)}`)}
          style={{
            borderWidth: 1,
            borderColor: "#111111",
            borderRadius: 14,
            backgroundColor: "#fff",
            padding: 14,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 16 }}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={{ marginTop: 4, fontWeight: "700" }}>
            {item.certifications?.[0] ? `Top skill: ${item.certifications[0]}` : "No listed skills"}
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>{item.email}</Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>${item.pricePerHour}/hr</Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>
            Experience: {item.experienceYears} year(s)
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>
            Certifications: {item.certifications?.join(", ") || "None"}
          </Text>
          <Text style={{ marginTop: 6, opacity: 0.7 }} numberOfLines={3}>
            {item.about || "No about text"}
          </Text>
          <Text style={{ marginTop: 8, fontWeight: "700", color: "#111" }}>Tap to view full profile</Text>
        </Pressable>
      )}
    />
  );
}
