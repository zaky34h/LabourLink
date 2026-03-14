import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert, RefreshControl, Modal } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  disableSupportUser,
  enableSupportUser,
  forceLogoutSupportUser,
  resetSupportUserPassword,
  searchSupportUsers,
  type SupportUser,
} from "../../src/owner/storage";

const BRAND_YELLOW = "#FDE047";
export default function OwnerSupport() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

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
    setResetPasswordEmail(email);
    setNewPassword("");
    setConfirmPassword("");
  }

  async function onConfirmResetPassword() {
    if (!resetPasswordEmail) return;
    if (!newPassword.trim()) {
      return Alert.alert("Missing password", "Enter a new password.");
    }
    if (newPassword.trim().length < 10) {
      return Alert.alert("Weak password", "Password must be at least 10 characters.");
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert("Passwords do not match", "Make sure both password fields match.");
    }

    setResettingPassword(true);
    try {
      await resetSupportUserPassword(resetPasswordEmail, newPassword);
      setResetPasswordEmail(null);
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password reset", `${resetPasswordEmail} can now sign in with the new password.`);
    } catch (error: any) {
      Alert.alert("Reset password failed", error?.message || "Try again.");
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <>
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
                <Text style={{ color: BRAND_YELLOW, fontWeight: "900" }}>Search</Text>
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
                <Text style={{ color: BRAND_YELLOW, fontWeight: "900" }}>Force Logout</Text>
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
                backgroundColor: BRAND_YELLOW,
              }}
            >
              <Text style={{ fontWeight: "900" }}>Reset Password</Text>
            </Pressable>
          </View>
        )}
      />

      <Modal visible={Boolean(resetPasswordEmail)} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "900" }}>Reset Password</Text>
            <Text style={{ opacity: 0.8 }}>{resetPasswordEmail}</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: "#111111",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: "#111111",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => {
                  if (resettingPassword) return;
                  setResetPasswordEmail(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#111111",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirmResetPassword}
                disabled={resettingPassword}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: resettingPassword ? "#444" : "#111",
                }}
              >
                <Text style={{ color: BRAND_YELLOW, fontWeight: "900" }}>
                  {resettingPassword ? "Resetting..." : "Save Password"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
