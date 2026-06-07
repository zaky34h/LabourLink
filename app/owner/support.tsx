import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Alert, RefreshControl, Modal, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  disableSupportUser,
  enableSupportUser,
  forceLogoutSupportUser,
  resetSupportUserPassword,
  searchSupportUsers,
  type SupportUser,
} from "../../src/owner/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

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
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xl }}
        data={users}
        keyExtractor={(item) => item.email}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
            <Text style={type.h1}>Support</Text>
            <Text style={type.secondary}>
              Search users and run admin actions: disable account, reset password, force logout.
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search name or email"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable
                onPress={() => loadUsers(query.trim())}
                disabled={loading}
                style={({ pressed }) => [
                  styles.searchButton,
                  pressed && { opacity: 0.85 },
                  loading && { opacity: 0.45 },
                ]}
              >
                <Text style={styles.searchButtonLabel}>Search</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={type.secondary}>{loading ? "Loading..." : "No users found."}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={{ ...type.secondary, marginTop: 3 }}>{item.email}</Text>
            <Text style={{ ...type.secondary, marginTop: 3 }}>
              Role: {item.role}
              {item.role === "builder" && item.companyName ? ` | ${item.companyName}` : ""}
              {item.role === "labourer" && item.occupation ? ` | ${item.occupation}` : ""}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: item.isDisabled ? colors.dangerBg : colors.successBg, marginTop: spacing.sm }]}>
              <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.caption, color: item.isDisabled ? colors.dangerText : colors.successText }}>
                {item.isDisabled ? "DISABLED" : "ACTIVE"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={item.isDisabled ? "Enable" : "Disable"}
                  variant={item.isDisabled ? "primary" : "destructive"}
                  onPress={() => (item.isDisabled ? onEnable(item.email) : onDisable(item.email))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Force Logout" variant="destructive" onPress={() => onForceLogout(item.email)} />
              </View>
            </View>

            <Button
              label="Reset Password"
              variant="secondary"
              onPress={() => onResetPassword(item.email)}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}
      />

      <Modal visible={Boolean(resetPasswordEmail)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={type.h2}>Reset Password</Text>
            <Text style={type.secondary}>{resetPasswordEmail}</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    if (resettingPassword) return;
                    setResetPasswordEmail(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={resettingPassword ? "Resetting..." : "Save Password"}
                  onPress={onConfirmResetPassword}
                  disabled={resettingPassword}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily,
    fontSize: fontSize.body,
    color: colors.text,
  },
  searchButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  searchButtonLabel: {
    fontFamily,
    fontWeight: fontWeight.heavy,
    fontSize: fontSize.body,
    color: colors.onPrimary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontFamily,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.heavy,
    color: colors.text,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
