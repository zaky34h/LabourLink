import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { loginUser } from "../src/auth/storage";

export default function Login() {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onLogin() {
    const res = await loginUser(email.trim(), password);
    if (!res.ok) return Alert.alert("Login failed", res.error);

    // Route based on role
    if (res.user.role === "builder") router.replace("/builder/home");
    else router.replace("/labourer/home");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 18 }}>
      <Text style={{ fontSize: 34, fontWeight: "900" }}>
        Labour<Text style={{ color: "#FACC15" }}>Link</Text>
      </Text>

      <View>
        <Text style={{ marginBottom: 6, fontWeight: "600" }}>Email Address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 14 }}
        />
      </View>

      <View>
        <Text style={{ marginBottom: 6, fontWeight: "600" }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 14 }}
        />
      </View>

      <Pressable onPress={() => setRememberMe(!rememberMe)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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

      <Pressable
        onPress={onLogin}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12, alignItems: "center", marginTop: 10 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Login</Text>
      </Pressable>

      <Pressable
        style={{ padding: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, alignItems: "center" }}
        onPress={() => Alert.alert("Google Sign-In", "We’ll add real Google Sign-In later.")}
      >
        <Text style={{ fontWeight: "700" }}>Sign in with Google</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/auth/register")}>
        <Text style={{ textAlign: "center", fontWeight: "700", marginTop: 6 }}>Create an account</Text>
      </Pressable>
    </View>
  );
}