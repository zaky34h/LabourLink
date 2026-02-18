import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { requestPasswordReset } from "../../src/auth/storage";
import { FormScreen } from "../../src/ui/FormScreen";

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

      const code = res.resetCode;
      if (code) {
        Alert.alert(
          "Reset code generated",
          `Use this code to reset your password: ${code}`,
          [
            {
              text: "Continue",
              onPress: () =>
                router.replace({
                  pathname: "/auth/reset-password",
                  params: { email: trimmedEmail, code },
                }),
            },
          ]
        );
        return;
      }

      router.replace({
        pathname: "/auth/reset-password",
        params: { email: trimmedEmail },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen>
      <View style={{ flex: 1, padding: 24, paddingTop: 48, gap: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: "900" }}>Forgot Password</Text>
        <Text style={{ opacity: 0.75 }}>
          Enter your account email and we will generate a reset code.
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "700" }}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@email.com"
            style={{
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 10,
              padding: 14,
            }}
          />
        </View>

        <Pressable
          onPress={onSendResetCode}
          disabled={submitting}
          style={{
            padding: 16,
            backgroundColor: submitting ? "#444444" : "#111111",
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FDE047", fontWeight: "900" }}>
            {submitting ? "Sending..." : "Send reset code"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/")}>
          <Text style={{ textAlign: "center", fontWeight: "700" }}>Back to Login</Text>
        </Pressable>
      </View>
    </FormScreen>
  );
}
