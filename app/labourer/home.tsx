import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { clearSession } from "../../src/auth/storage";
import { useCurrentUser } from "../../src/auth/useCurrentUser";

export default function LabourerHome() {
  const { user, loading } = useCurrentUser();

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Labourer Home</Text>

      {user?.role === "labourer" && (
        <View style={{ padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
          <Text style={{ fontWeight: "800" }}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={{ opacity: 0.7, marginTop: 4 }}>
            {user.occupation} • ${user.pricePerHour}/hr
          </Text>
        </View>
      )}

      <Pressable
        onPress={logout}
        style={{ padding: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "800" }}>Logout</Text>
      </Pressable>
    </View>
  );
}