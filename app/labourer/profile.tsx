import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { clearSession } from "../../src/auth/storage";
import { useCurrentUser } from "../../src/auth/useCurrentUser";

export default function LabourerProfile() {
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

  if (!user || user.role !== "labourer") {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Not logged in</Text>
        <Pressable onPress={() => router.replace("/")} style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "800" }}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Profile</Text>

      <View style={{ padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 12, gap: 6 }}>
        <Text style={{ fontWeight: "900" }}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={{ opacity: 0.75 }}>{user.occupation}</Text>
        <Text style={{ opacity: 0.75 }}>${user.pricePerHour}/hr</Text>
        <Text style={{ opacity: 0.75 }}>{user.email}</Text>
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>About</Text>
        <Text style={{ opacity: 0.8 }}>{user.about}</Text>
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>Availability dates</Text>
        <Text style={{ opacity: 0.8 }}>{user.availableDates?.length ?? 0} selected</Text>
      </View>

      <Pressable
        onPress={logout}
        style={{ padding: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, alignItems: "center", marginTop: 6 }}
      >
        <Text style={{ fontWeight: "900" }}>Logout</Text>
      </Pressable>
    </View>
  );
}