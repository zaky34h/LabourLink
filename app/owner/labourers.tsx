import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { type LabourerUser } from "../../src/auth/storage";
import { getOwnerLabourers } from "../../src/owner/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xl }}
      data={labourers}
      keyExtractor={(item) => item.email}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Text style={type.h1}>All Labourers</Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>Total: {labourers.length}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/owner/labourer/${encodeURIComponent(item.email)}`)}
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
            {item.certifications?.[0] ? `Top skill: ${item.certifications[0]}` : "No listed skills"}
          </Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>{item.email}</Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>${item.pricePerHour}/hr</Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>
            Experience: {item.experienceYears} year(s)
          </Text>
          <Text style={{ ...type.secondary, marginTop: spacing.xs }}>
            Certifications: {item.certifications?.join(", ") || "None"}
          </Text>
          <Text style={{ ...type.secondary, marginTop: 6 }} numberOfLines={3}>
            {item.about || "No about text"}
          </Text>
          <Text style={{ fontFamily, marginTop: spacing.sm, fontWeight: fontWeight.bold, color: colors.text }}>
            Tap to view full profile
          </Text>
        </Pressable>
      )}
    />
  );
}
