import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  disableSupportUser,
  enableSupportUser,
  forceLogoutSupportUser,
  resetSupportUserPassword,
  searchSupportUsers,
  type SupportUser,
} from "../../src/owner/storage";

export default function OwnerSupport() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<SupportUser[]>([]);

  async function loadUsers(q: string) {
    setLoading(true);
    try {
      const rows = await searchSupportUsers(q);
      setUsers(rows);
    } catch (error: any) {
      Alert.alert("Could not load users", error?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadUsers(query.trim());
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadUsers("");
    }, [])
  );

  async function onDisable(email: string) {
    try {
      await disableSupportUser(email);
      await loadUsers(query.trim());
      Alert.alert("User disabled", `${email} has been disabled.`);
    } catch (error: any) {
      Alert.alert("Disable failed", error?.message || "Try again.");
    }
  }

  async function onEnable(email: string) {
    try {
      await enableSupportUser(email);
      await loadUsers(query.trim());
      Alert.alert("User enabled", `${email} can access the app again.`);
    } catch (error: any) {
      Alert.alert("Enable failed", error?.message || "Try again.");
    }
  }

  async function onForceLogout(email: string) {
    try {
      await forceLogoutSupportUser(email);
      Alert.alert("Forced logout", `${email} has been logged out from active sessions.`);
    } catch (error: any) {
      Alert.alert("Force logout failed", error?.message || "Try again.");
    }
  }

  async function onResetPassword(email: string) {
    try {
      const tempPassword = await resetSupportUserPassword(email);
      Alert.alert("Password reset", `Temporary password for ${email}: ${tempPassword}`);
    } catch (error: any) {
      Alert.alert("Reset password failed", error?.message || "Try again.");
    }
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 24 }}
      data={users}
      keyExtractor={(item) => item.email}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 12, gap: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: "900" }}>Support</Text>
          <Text style={{ opacity: 0.75 }}>
            Search users and run admin actions: disable account, reset password, force logout.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name or email"
              autoCapitalize="none"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#111111",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
            <Pressable
              onPress={() => loadUsers(query.trim())}
              disabled={loading}
              style={{
                paddingHorizontal: 14,
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor: loading ? "#444" : "#111",
              }}
            >
              <Text style={{ color: "#FDE047", fontWeight: "900" }}>Search</Text>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={{ opacity: 0.7 }}>{loading ? "Loading..." : "No users found."}</Text>}
      renderItem={({ item }) => (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#111111",
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontWeight: "900" }}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={{ marginTop: 3, opacity: 0.8 }}>{item.email}</Text>
          <Text style={{ marginTop: 3, opacity: 0.8 }}>
            Role: {item.role}
            {item.role === "builder" && item.companyName ? ` | ${item.companyName}` : ""}
            {item.role === "labourer" && item.occupation ? ` | ${item.occupation}` : ""}
          </Text>
          <Text style={{ marginTop: 3, fontWeight: "700", color: item.isDisabled ? "#B91C1C" : "#166534" }}>
            {item.isDisabled ? "Disabled" : "Active"}
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() => (item.isDisabled ? onEnable(item.email) : onDisable(item.email))}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: item.isDisabled ? "#16A34A" : "#B91C1C",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {item.isDisabled ? "Enable" : "Disable"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onForceLogout(item.email)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: "#111",
              }}
            >
              <Text style={{ color: "#FDE047", fontWeight: "900" }}>Force Logout</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => onResetPassword(item.email)}
            style={{
              marginTop: 8,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#111111",
              alignItems: "center",
              backgroundColor: "#FEF08A",
            }}
          >
            <Text style={{ fontWeight: "900" }}>Reset Password</Text>
          </Pressable>
        </View>
      )}
    />
  );
}
