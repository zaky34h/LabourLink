import { View, Text, TextInput, Pressable, Image, Alert } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSessionEmail, getUserByEmail, loginUser } from "../src/auth/storage";
import { clearSessionStorage } from "../src/api/client";
import { FormScreen } from "../src/ui/FormScreen";

const REMEMBER_ME_KEY = "labourlink_remember_me";
const REMEMBERED_EMAIL_KEY = "labourlink_remembered_email";

export default function Login() {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;

    async function bootstrapRememberMe() {
      const rememberFlag = (await AsyncStorage.getItem(REMEMBER_ME_KEY)) === "1";
      if (!active) return;
      setRememberMe(rememberFlag);

      const rememberedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (active && rememberedEmail) setEmail(rememberedEmail);

      if (!rememberFlag) {
        await clearSessionStorage();
        return;
      }

      const sessionEmail = await getSessionEmail();
      if (!sessionEmail) return;

      const user = await getUserByEmail(sessionEmail);
      if (!user) return;
      if (!active) return;

      if (user.role === "builder") router.replace("/builder/home");
      else if (user.role === "labourer") router.replace("/labourer/home");
      else router.replace("/owner/home");
    }

    bootstrapRememberMe();
    return () => {
      active = false;
    };
  }, []);

  async function onLogin() {
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

    if (res.user.role === "builder") router.replace("/builder/home");
    else if (res.user.role === "labourer") router.replace("/labourer/home");
    else router.replace("/owner/home");
  }

  return (
    <FormScreen>
      {/* 👇 THIS is the key fix */}
      <View
        style={{
          flex: 1,
          padding: 24,
          paddingTop: 48,
          gap: 18,
          backgroundColor: "#fff",
        }}
      >
        {/* Logo / Title */}
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <Image
            source={require("../assets/labourlink-logo.png")}
            style={{ width: 300, height: 150 }}
            resizeMode="contain"
          />
        </View>

        {/* Email */}
        <View>
          <Text style={{ marginBottom: 6, fontWeight: "600" }}>
            Email Address
          </Text>
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

        {/* Password */}
        <View>
          <Text style={{ marginBottom: 6, fontWeight: "600" }}>
            Password
          </Text>
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

        {/* Remember me */}
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
          <Text>Remember me</Text>
        </Pressable>

        {/* Login button */}
        <Pressable
          onPress={onLogin}
          style={{
            padding: 16,
            backgroundColor: "#111",
            borderRadius: 12,
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <Text style={{ color: "#FDE047", fontWeight: "800" }}>
            Login
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/auth/forgot-password")}
          style={{ alignItems: "center" }}
        >
          <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>
            Forgot password?
          </Text>
        </Pressable>

        {/* Create account */}
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
    </FormScreen>
  );
}
