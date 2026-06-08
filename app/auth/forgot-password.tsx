import { useState } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { requestPasswordReset } from "../../src/auth/storage";
import { FormScreen } from "../../src/ui/FormScreen";
import { colors, spacing, radii, type } from "../../src/theme";
import Button from "../../src/ui/Button";
import TextField from "../../src/ui/TextField";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSendResetCode() {
    if (submitting) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return Alert.alert("Missing email", "Please enter your email address.");
    }

    setSubmitting(true);
    try {
      const res = await requestPasswordReset(trimmedEmail);
      if (!res.ok) return Alert.alert("Could not request reset", res.error);

      // The reset code is delivered out-of-band (email/SMS) — it is never returned
      // by the API. Send the user to the reset screen to enter the code they receive.
      Alert.alert(
        "Check your email",
        "If an account exists for that address, a password reset code has been sent. Enter it on the next screen.",
        [
          {
            text: "Continue",
            onPress: () =>
              router.replace({
                pathname: "/auth/reset-password",
                params: { email: trimmedEmail },
              }),
          },
        ]
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen backgroundColor={colors.background}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your account email and we will generate a reset code.
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

          <Button
            label={submitting ? "Sending..." : "Send reset code"}
            onPress={onSendResetCode}
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
