import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { resetPassword } from "../../src/auth/storage";
import { FormScreen } from "../../src/ui/FormScreen";

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
    if (newPassword.length < 6) {
      return Alert.alert("Weak password", "Password must be at least 6 characters.");
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
    <FormScreen>
      <View style={{ flex: 1, padding: 24, paddingTop: 48, gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: "900" }}>Reset Password</Text>
        <Text style={{ opacity: 0.75 }}>
          Enter your reset code and choose a new password.
        </Text>

        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@email.com"
        />
        <Field
          label="Reset Code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="6-digit code"
        />
        <Field
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="New password"
        />
        <Field
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm password"
        />

        <Pressable
          onPress={onResetPassword}
          disabled={submitting}
          style={{
            padding: 16,
            backgroundColor: submitting ? "#444444" : "#111111",
            borderRadius: 12,
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <Text style={{ color: "#FDE047", fontWeight: "900" }}>
            {submitting ? "Resetting..." : "Reset password"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/")}>
          <Text style={{ textAlign: "center", fontWeight: "700" }}>Back to Login</Text>
        </Pressable>
      </View>
    </FormScreen>
  );
}

function Field(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700" }}>{label}</Text>
      <TextInput
        {...rest}
        style={{
          borderWidth: 1,
          borderColor: "#111111",
          borderRadius: 10,
          padding: 14,
        }}
      />
    </View>
  );
}
