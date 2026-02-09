import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { getUserByEmail, type LabourerUser } from "../../../src/auth/storage";

export default function LabourerProfile() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const decodedEmail = decodeURIComponent(email ?? "");

  const [loading, setLoading] = useState(true);
  const [labourer, setLabourer] = useState<LabourerUser | null>(null);

  async function load() {
    setLoading(true);
    const user = await getUserByEmail(decodedEmail);
    if (user && user.role === "labourer") setLabourer(user);
    else setLabourer(null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [decodedEmail]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!labourer) {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Not found</Text>
        <Text style={{ marginTop: 6, opacity: 0.7 }}>
          This labourer account doesn’t exist.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "800" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>
        {labourer.firstName} {labourer.lastName}
      </Text>

      <View style={{ padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>{labourer.occupation}</Text>
        <Text style={{ fontWeight: "800" }}>${labourer.pricePerHour}/hr</Text>
        <Text style={{ opacity: 0.75 }}>{labourer.email}</Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800" }}>About</Text>
      <Text style={{ opacity: 0.8 }}>{labourer.about}</Text>

      <Pressable
        onPress={() => router.push(`/chat/${encodeURIComponent(labourer.email)}`)}
        style={{ marginTop: 10, padding: 16, backgroundColor: "#111", borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Message</Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={{ padding: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "800" }}>Back</Text>
      </Pressable>
    </View>
  );
}