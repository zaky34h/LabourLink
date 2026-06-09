import { View, Text, Image, Pressable, Alert, Keyboard, Platform, KeyboardAvoidingView, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { getSessionEmail, getUserByEmail, loginUser } from "../src/auth/storage";
import { routeForUser } from "../src/auth/routing";
import { AuthSocialButtons } from "../src/auth/AuthSocialButtons";
import { clearSessionStorage } from "../src/api/client";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../src/theme";
import Button from "../src/ui/Button";
import TextField from "../src/ui/TextField";

const REMEMBER_ME_KEY = "labourlink_remember_me";
const REMEMBERED_EMAIL_KEY = "labourlink_remembered_email";

export default function Login() {
  const insets = useSafeAreaInsets();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrapRememberMe() {
      try {
        const [rememberRaw, rememberedEmail, sessionEmail] = await Promise.all([
          AsyncStorage.getItem(REMEMBER_ME_KEY),
          AsyncStorage.getItem(REMEMBERED_EMAIL_KEY),
          getSessionEmail(),
        ]);

        const rememberFlag = rememberRaw === "1";
        if (!active) return;
        setRememberMe(rememberFlag);
        if (rememberedEmail) setEmail(rememberedEmail);

        if (!rememberFlag) {
          await clearSessionStorage();
          return;
        }

        if (!sessionEmail) return;

        const user = await getUserByEmail(sessionEmail);
        if (!active || !user) return;

        router.replace(routeForUser(user));
      } finally {
        if (active) setBootstrapping(false);
      }
    }

    void bootstrapRememberMe();
    return () => {
      active = false;
    };
  }, []);

  async function onLogin() {
    if (submitting) return;
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      return Alert.alert("Missing info", "Please enter your email and password.");
    }

    setSubmitting(true);
    try {
      const res = await loginUser(email.trim(), password);
      if (!res.ok) return Alert.alert("Login failed", res.error);

      if (rememberMe) {
        await AsyncStorage.multiSet([
          [REMEMBER_ME_KEY, "1"],
          [REMEMBERED_EMAIL_KEY, email.trim()],
        ]);
      } else {
        await AsyncStorage.multiRemove([REMEMBERED_EMAIL_KEY]);
        await AsyncStorage.setItem(REMEMBER_ME_KEY, "0");
      }

      router.replace(routeForUser(res.user));
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
              source={require("../assets/labourlink-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Companies and labourers connected fast</Text>
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
              placeholder="••••••••"
              secureToggle
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.row}>
              <Pressable
                style={styles.remember}
                onPress={() => setRememberMe(!rememberMe)}
                hitSlop={6}
              >
                <View style={styles.checkbox}>
                  {rememberMe ? (
                    <Ionicons name="checkmark" size={13} color={colors.text} />
                  ) : null}
                </View>
                <Text style={styles.rememberLabel}>Remember me</Text>
              </Pressable>
              <Pressable hitSlop={6} onPress={() => router.push("/auth/forgot-password")}>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            </View>

            <Button
              label={bootstrapping ? "Checking session..." : submitting ? "Logging in..." : "Login"}
              onPress={onLogin}
              loading={submitting}
              disabled={submitting || bootstrapping}
              style={{ marginTop: spacing.lg }}
            />
            <Button
              label="Create an account"
              variant="secondary"
              onPress={() => router.push("/auth/register")}
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
  tagline: { ...type.secondary, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  remember: { flexDirection: "row", alignItems: "center", gap: 7 },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberLabel: {
    fontFamily,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  link: {
    fontFamily,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textDecorationLine: "underline",
  },
});
