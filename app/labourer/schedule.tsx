import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateLabourerAvailability } from "../../src/auth/updateAvailability";

export default function LabourerSchedule() {
  const { user, loading, reload } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role === "labourer") {
      setSelected(user.availableDates ?? []);
    }
  }, [user]);

  function toggleDate(dateString: string) {
    setSelected((prev) =>
      prev.includes(dateString)
        ? prev.filter((d) => d !== dateString)
        : [...prev, dateString]
    );
  }

  const markedDates = useMemo(() => {
    return selected.reduce((acc, d) => {
      acc[d] = { selected: true, selectedColor: "#111", selectedTextColor: "#FDE047" };
      return acc;
    }, {} as Record<string, any>);
  }, [selected]);

  async function onSave() {
    if (!user || user.role !== "labourer") return;
    setSaving(true);
    const res = await updateLabourerAvailability(user.email, selected.sort());
    setSaving(false);

    if (!res.ok) return Alert.alert("Couldn’t save", res.error);
    await reload();
    Alert.alert("Saved", "Your availability has been updated.");
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, paddingTop: 60, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Schedule</Text>
      <Text style={{ marginTop: 6, opacity: 0.7 }}>
        Tap dates you are available. Builders can filter by date.
      </Text>

      <View style={{ height: 14 }} />

      <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#111111", padding: 10 }}>
        <Calendar onDayPress={(day) => toggleDate(day.dateString)} markedDates={markedDates} />
      </View>

      <Text style={{ marginTop: 12, opacity: 0.7, fontWeight: "700" }}>
        Selected: {selected.length}
      </Text>

      <Pressable
        onPress={() => setSelected([])}
        style={{
          marginTop: 8,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#111111",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontWeight: "800" }}>Clear All</Text>
      </Pressable>

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={{
          marginTop: 14,
          padding: 16,
          borderRadius: 14,
          backgroundColor: saving ? "#444" : "#111",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#FDE047", fontWeight: "900" }}>
          {saving ? "Saving..." : "Save Availability"}
        </Text>
      </Pressable>
    </View>
  );
}
