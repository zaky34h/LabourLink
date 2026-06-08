import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { type BuilderUser } from "../../src/auth/storage";
import { getOwnerBuilders } from "../../src/owner/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xl }}
      data={builders}
      keyExtractor={(item) => item.email}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Text style={type.h1}>All Builders</Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>Total: {builders.length}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/owner/builder/${encodeURIComponent(item.email)}`)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.xl,
            backgroundColor: colors.surface,
            padding: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.h3, color: colors.text }}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={{ ...type.body, marginTop: spacing.xs, fontWeight: fontWeight.bold }}>
            {item.companyName || "No company name"}
          </Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>{item.email}</Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>{item.address || "No address"}</Text>
          <Text style={{ fontFamily, marginTop: spacing.sm, fontWeight: fontWeight.bold, color: colors.text }}>
            Tap to view full profile
          </Text>
        </Pressable>
      )}
    />
  );
}
