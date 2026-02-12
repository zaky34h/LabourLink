import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Image, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar } from "react-native-calendars";
import { getUserByEmail, type LabourerUser } from "../../../src/auth/storage";
import { useCurrentUser } from "../../../src/auth/useCurrentUser";
import { isLabourerSaved, saveLabourer, unsaveLabourer } from "../../../src/saved-labourers/storage";

export default function LabourerProfileView() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const labourerEmail = decodeURIComponent(email ?? "");
  const { user } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [labourer, setLabourer] = useState<LabourerUser | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const u = await getUserByEmail(labourerEmail);
      const nextLabourer = u?.role === "labourer" ? (u as LabourerUser) : null;
      setLabourer(nextLabourer);
      if (user?.role === "builder" && nextLabourer) {
        const state = await isLabourerSaved(nextLabourer.email).catch(() => false);
        setSaved(state);
      } else {
        setSaved(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onToggleSaved() {
    if (!labourer || user?.role !== "builder" || saving) return;
    setSaving(true);
    try {
      if (saved) {
        await unsaveLabourer(labourer.email);
        setSaved(false);
      } else {
        await saveLabourer(labourer.email);
        setSaved(true);
      }
    } catch (error: any) {
      Alert.alert("Couldn’t update saved labourer", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [labourerEmail, user?.role]);

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
  const currentMonthAvailableDates = (labourer.availableDates ?? [])
    .filter((d) => isCurrentMonthDate(d))
    .sort((a, b) => a.localeCompare(b));
  const currentMonthCalendarDate = getCurrentMonthAnchorIso();
  const markedDates = currentMonthAvailableDates.reduce((acc, d) => {
    acc[d] = {
      selected: true,
      selectedColor: "#111",
      selectedTextColor: "#FDE047",
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 30, gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#111111" }}
        >
          <Text style={{ fontWeight: "900" }}>Back</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/chat/${encodeURIComponent(labourer.email)}`)}
          style={{ marginLeft: "auto", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#111" }}
        >
          <Text style={{ color: "#FDE047", fontWeight: "900" }}>Message</Text>
        </Pressable>

        {user?.role === "builder" ? (
          <Pressable
            disabled={saving}
            onPress={onToggleSaved}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#111111",
              backgroundColor: saved ? "#FDE047" : "#fff",
              marginLeft: 8,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ fontWeight: "900" }}>{saved ? "★ Saved" : "☆ Save"}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Profile card */}
      <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#111111", padding: 16, gap: 12 }}>
        {/* Photo */}
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: "#FDE047", overflow: "hidden", borderWidth: 1, borderColor: "#111111" }}>
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
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#FDE047" }}>
          <Text style={{ fontWeight: "900" }}>About</Text>
          <Text style={{ marginTop: 6, opacity: 0.8 }}>{labourer.about}</Text>
        </View>

        {/* Experience */}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#FDE047" }}>
          <Text style={{ fontWeight: "900" }}>Experience</Text>
          <Text style={{ marginTop: 6, opacity: 0.8 }}>{exp} years</Text>
        </View>

        {/* Certifications */}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#FDE047" }}>
          <Text style={{ fontWeight: "900" }}>Certifications</Text>
          <View style={{ marginTop: 8, gap: 8 }}>
            {certs.map((c) => (
              <View key={c} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#FDE047" }}>
                <Text style={{ fontWeight: "800" }}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#FDE047" }}>
          <Text style={{ fontWeight: "900" }}>Availability</Text>
          <Text style={{ marginTop: 6, opacity: 0.8, fontWeight: "700" }}>
            Current month: {currentMonthAvailableDates.length} date(s)
          </Text>
          <View style={{ marginTop: 8, borderWidth: 1, borderColor: "#111111", borderRadius: 12, padding: 8 }}>
            <Calendar
              current={currentMonthCalendarDate}
              markedDates={markedDates}
              onMonthChange={() => {}}
              enableSwipeMonths={false}
              hideExtraDays={false}
              disableMonthChange
            />
          </View>
          {!currentMonthAvailableDates.length ? (
            <Text style={{ marginTop: 8, opacity: 0.75 }}>No available dates in this month.</Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function isCurrentMonthDate(isoDate: string) {
  const m = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function formatDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function getCurrentMonthAnchorIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}
