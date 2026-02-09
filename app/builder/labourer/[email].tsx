import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Image, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getUserByEmail, type LabourerUser } from "../../../src/auth/storage";

export default function LabourerProfileView() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const labourerEmail = decodeURIComponent(email ?? "");

  const [loading, setLoading] = useState(true);
  const [labourer, setLabourer] = useState<LabourerUser | null>(null);

  async function load() {
    setLoading(true);
    const u = await getUserByEmail(labourerEmail);
    setLabourer(u?.role === "labourer" ? (u as LabourerUser) : null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [labourerEmail]);

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
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Labourer not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "900" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const fullName = `${labourer.firstName} ${labourer.lastName}`;
  const certs = labourer.certifications ?? ["White Card (example)", "Working at Heights (example)"];
  const exp = labourer.experienceYears ?? 3;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F6F7FB" }} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 30, gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E9E9EE" }}
        >
          <Text style={{ fontWeight: "900" }}>Back</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/chat/${encodeURIComponent(labourer.email)}`)}
          style={{ marginLeft: "auto", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#111" }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>Message</Text>
        </Pressable>
      </View>

      {/* Profile card */}
      <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#E9E9EE", padding: 16, gap: 12 }}>
        {/* Photo */}
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: "#F2F3F8", overflow: "hidden", borderWidth: 1, borderColor: "#E9E9EE" }}>
            {labourer.photoUrl ? (
              <Image source={{ uri: labourer.photoUrl }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontWeight: "900", fontSize: 22 }}>
                  {labourer.firstName[0]}
                  {labourer.lastName[0]}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: "900" }}>{fullName}</Text>
            <Text style={{ fontWeight: "800", opacity: 0.8 }}>{labourer.occupation}</Text>
            <Text style={{ opacity: 0.75 }}>${labourer.pricePerHour}/hr</Text>
          </View>
        </View>

        {/* About */}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EEE" }}>
          <Text style={{ fontWeight: "900" }}>About</Text>
          <Text style={{ marginTop: 6, opacity: 0.8 }}>{labourer.about}</Text>
        </View>

        {/* Experience */}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EEE" }}>
          <Text style={{ fontWeight: "900" }}>Experience</Text>
          <Text style={{ marginTop: 6, opacity: 0.8 }}>{exp} years</Text>
        </View>

        {/* Certifications */}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EEE" }}>
          <Text style={{ fontWeight: "900" }}>Certifications</Text>
          <View style={{ marginTop: 8, gap: 8 }}>
            {certs.map((c) => (
              <View key={c} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#F2F3F8" }}>
                <Text style={{ fontWeight: "800" }}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EEE" }}>
          <Text style={{ fontWeight: "900" }}>Availability</Text>
          <Text style={{ marginTop: 6, opacity: 0.8 }}>
            {(labourer.availableDates ?? []).length} date(s) selected
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}