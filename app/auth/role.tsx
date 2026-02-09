import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function RoleSelect() {
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Who are you?</Text>
      <Text style={{ opacity: 0.7 }}>
        Choose a role to continue. (We can allow switching later.)
      </Text>

      <Pressable
        onPress={() => router.push("/builder/home")}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>I’m a Builder</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/labourer/home")}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>I’m a Labourer / Tradie</Text>
      </Pressable>
    </View>
  );
}