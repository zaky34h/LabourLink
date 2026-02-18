import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSessionEmail, getUserByEmail, loginUser, type User } from "../src/auth/storage";
import { clearSessionStorage } from "../src/api/client";
import { FormScreen } from "../src/ui/FormScreen";

const REMEMBER_ME_KEY = "labourlink_remember_me";
const REMEMBERED_EMAIL_KEY = "labourlink_remembered_email";

function routeForRole(role: User["role"]) {
  if (role === "builder") return "/builder/home";
  if (role === "owner") return "/owner/home";
  return "/labourer/home";
}

export default function Login() {
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

        router.replace(routeForRole(user.role));
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

      router.replace(routeForRole(res.user.role));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen backgroundColor="#FFF8D9">
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFF8D9",
          padding: 24,
          paddingTop: 48,
          gap: 18,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: -70,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: "#FFE15A",
            opacity: 0.45,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: -70,
            width: 340,
            height: 340,
            borderRadius: 170,
            backgroundColor: "#111111",
            opacity: 0.08,
          }}
        />

        <View style={{ alignItems: "center", marginTop: 8 }}>
          <Image
            source={require("../assets/labourlink-logo.png")}
            style={{ width: 280, height: 130 }}
            resizeMode="contain"
          />
          <Text style={{ marginTop: 4, fontWeight: "700", opacity: 0.75 }}>
            Builders and labourers connected fast
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#111111",
            borderRadius: 18,
            backgroundColor: "#fff",
            padding: 16,
            gap: 14,
          }}
        >
          <View>
            <Text style={{ marginBottom: 6, fontWeight: "700" }}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                borderWidth: 1,
                borderColor: "#111111",
                borderRadius: 10,
                padding: 14,
              }}
            />
          </View>

          <View>
            <Text style={{ marginBottom: 6, fontWeight: "700" }}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: "#111111",
                borderRadius: 10,
                padding: 14,
              }}
            />
          </View>

          <Pressable
            onPress={() => setRememberMe(!rememberMe)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#111",
                backgroundColor: rememberMe ? "#111" : "transparent",
              }}
            />
            <Text style={{ fontWeight: "600" }}>Remember me</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/auth/forgot-password")}
            style={{ alignSelf: "flex-end" }}
          >
            <Text style={{ fontWeight: "700", color: "#111111", textDecorationLine: "underline" }}>
              Forgot password?
            </Text>
          </Pressable>

          <Pressable
            onPress={onLogin}
            disabled={submitting || bootstrapping}
            style={{
              padding: 16,
              backgroundColor: submitting || bootstrapping ? "#444" : "#111",
              borderRadius: 12,
              alignItems: "center",
              marginTop: 2,
              opacity: submitting || bootstrapping ? 0.9 : 1,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {submitting ? <ActivityIndicator size="small" color="#FDE047" /> : null}
            <Text style={{ color: "#FDE047", fontWeight: "800" }}>
              {bootstrapping ? "Checking session..." : submitting ? "Logging in..." : "Login"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/auth/register")}
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: "#FDE047",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "700",
                color: "#111111",
              }}
            >
              Create an account
            </Text>
          </Pressable>
        </View>
      </View>
    </FormScreen>
  );
}
