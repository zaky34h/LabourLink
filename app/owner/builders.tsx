import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { type BuilderUser } from "../../src/auth/storage";
import { getOwnerBuilders } from "../../src/owner/storage";

export default function OwnerBuilders() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [builders, setBuilders] = useState<BuilderUser[]>([]);

  async function load() {
    try {
      const rows = await getOwnerBuilders();
      setBuilders(rows);
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
      data={builders}
      keyExtractor={(item) => item.email}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: "900" }}>All Builders</Text>
          <Text style={{ opacity: 0.75 }}>Total: {builders.length}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View
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
          <Text style={{ marginTop: 4, fontWeight: "700" }}>{item.companyName || "No company name"}</Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>{item.email}</Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>{item.address || "No address"}</Text>
          <Text style={{ marginTop: 6, opacity: 0.7 }} numberOfLines={3}>
            {item.about || "No about text"}
          </Text>
        </View>
      )}
    />
  );
}
