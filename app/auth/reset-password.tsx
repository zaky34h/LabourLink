import { useMemo, useState } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { resetPassword } from "../../src/auth/storage";
import { FormScreen } from "../../src/ui/FormScreen";
import { colors, spacing, radii, type } from "../../src/theme";
import Button from "../../src/ui/Button";
import TextField from "../../src/ui/TextField";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const initialEmail = useMemo(() => String(params.email || ""), [params.email]);
  const initialCode = useMemo(() => String(params.code || ""), [params.code]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onResetPassword() {
    if (submitting) return;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    if (!trimmedEmail || !trimmedCode || !newPassword) {
      return Alert.alert("Missing details", "Email, reset code, and new password are required.");
    }
    if (newPassword.length < 10) {
      return Alert.alert("Weak password", "Password must be at least 10 characters.");
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert("Password mismatch", "New password and confirm password do not match.");
    }

    setSubmitting(true);
    try {
      const res = await resetPassword(trimmedEmail, trimmedCode, newPassword);
      if (!res.ok) return Alert.alert("Could not reset password", res.error);

      Alert.alert("Password reset", "Your password has been updated. Please log in.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen backgroundColor={colors.background}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your reset code and choose a new password.
        </Text>

        <View style={styles.card}>
          <TextField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@email.com"
          />
          <TextField
            label="Reset Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="6-digit code"
          />
          <TextField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureToggle
            placeholder="New password"
          />
          <TextField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureToggle
            placeholder="Confirm password"
          />

          <Button
            label={submitting ? "Resetting..." : "Reset password"}
            onPress={onResetPassword}
            loading={submitting}
            disabled={submitting}
            style={{ marginTop: spacing.sm }}
          />

          <Button
            label="Back to Login"
            variant="secondary"
            onPress={() => router.replace("/")}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: { ...type.h1 },
  subtitle: { ...type.secondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
});
