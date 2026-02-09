import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Labour Link</Text>

      <Pressable
        onPress={() => router.push("/auth/role")}
        style={{ paddingVertical: 12, paddingHorizontal: 18, backgroundColor: "#111", borderRadius: 10 }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Get Started</Text>
      </Pressable>
    </View>
  );
}