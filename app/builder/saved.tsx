import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getSavedLabourers, unsaveLabourer } from "../../src/saved-labourers/storage";
import type { LabourerUser } from "../../src/auth/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

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
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 }}
      data={labourers}
      keyExtractor={(item) => item.email}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        <View>
          <Text style={type.h1}>Saved Labourers</Text>
          <Text style={{ ...type.secondary, marginTop: spacing.sm, fontWeight: fontWeight.bold }}>
            Star labourers on their profile to save them here.
          </Text>
          <View style={{ height: spacing.md }} />
        </View>
      }
      ListEmptyComponent={
        <Text style={{ ...type.secondary, marginTop: spacing.xl, fontWeight: fontWeight.bold }}>
          No saved labourers yet.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={{ ...type.secondary, marginTop: 4 }}>${item.pricePerHour}/hr</Text>

          <View style={{ marginTop: spacing.md, flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={() => router.push(`/builder/labourer/${encodeURIComponent(item.email)}`)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnLabel}>View</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/chat/${encodeURIComponent(item.email)}`)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnLabel}>Message</Text>
            </Pressable>
            <Pressable
              disabled={busyEmail === item.email}
              onPress={() => onUnsave(item.email)}
              style={[styles.unsaveBtn, { opacity: busyEmail === item.email ? 0.6 : 1 }]}
            >
              <Text style={styles.secondaryBtnLabel}>{busyEmail === item.email ? "..." : "Unsave"}</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  cardTitle: { fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  primaryBtnLabel: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.heavy, color: colors.onPrimary },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.field,
  },
  secondaryBtnLabel: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.heavy, color: colors.text },
  unsaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.field,
  },
});
