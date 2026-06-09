import { useState } from "react";
import { View, Text, Image, Alert, Keyboard, Platform, KeyboardAvoidingView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { loginUser, registerUser } from "../../src/auth/storage";
import { routeForUser } from "../../src/auth/routing";
import { AuthSocialButtons } from "../../src/auth/AuthSocialButtons";
import { colors, spacing, radii, type } from "../../src/theme";
import Button from "../../src/ui/Button";
import TextField from "../../src/ui/TextField";

export default function Register() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function isEmailValid(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  // Mirrors backend validatePasswordStrength (backend/server.js) so users get the
  // error before submitting. Keep these rules and messages in sync with the server.
  function passwordError(value: string) {
    if (value.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-z]/.test(value)) return "Password must include a lowercase letter.";
    if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter.";
    if (!/\d/.test(value)) return "Password must include a number.";
    return null;
  }

  async function onCreateAccount() {
    if (submitting) return;
    Keyboard.dismiss();

    if (!isEmailValid(email)) {
      return Alert.alert("Invalid email", "Please enter a valid email address.");
    }
    const pwError = passwordError(password);
    if (pwError) {
      return Alert.alert("Weak password", pwError);
    }

    setSubmitting(true);
    try {
      const res = await registerUser({
        role: "pending",
        firstName: "",
        lastName: "",
        email: email.trim(),
        password,
      });
      if (!res.ok) return Alert.alert("Couldn’t create account", res.error);

      const loginRes = await loginUser(email.trim(), password);
      if (!loginRes.ok) {
        return Alert.alert("Account created", "Please log in.", [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
      }

      router.replace(routeForUser(loginRes.user));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* soft cream background blobs — full-bleed to the screen edges */}
      <View style={[styles.blob, { top: -70, left: -70 }]} />
      <View style={[styles.blob, { bottom: -70, right: -70 }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="always"
          extraScrollHeight={20}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={styles.header}>
            <Image
              source={require("../../assets/labourlink-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Create your account</Text>
          </View>

          <View style={styles.card}>
            {/* AuthSocialButtons renders its own "or" divider below the buttons */}
            <AuthSocialButtons />

            <TextField
              label="Email address"
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextField
              label="Password"
              placeholder="Minimum 8 characters"
              secureToggle
              value={password}
              onChangeText={setPassword}
            />

            <Button
              label={submitting ? "Creating..." : "Create Account"}
              onPress={onCreateAccount}
              loading={submitting}
              disabled={submitting}
              style={{ marginTop: spacing.lg }}
            />
            <Button
              label="Back to Login"
              variant="secondary"
              onPress={() => router.replace("/")}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: colors.background },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  header: { alignItems: "center", marginBottom: spacing.xl },
  logo: { width: 240, height: 96 },
  title: { ...type.h3, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
});
