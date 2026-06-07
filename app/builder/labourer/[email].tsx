import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Image, ScrollView, Alert, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar } from "react-native-calendars";
import { getUserByEmail, type LabourerUser } from "../../../src/auth/storage";
import { useCurrentUser } from "../../../src/auth/useCurrentUser";
import { isLabourerSaved, saveLabourer, unsaveLabourer } from "../../../src/saved-labourers/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../../src/theme";
import Button from "../../../src/ui/Button";

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
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!labourer) {
    return (
      <View style={{ flex: 1, padding: spacing.xl, paddingTop: 60, backgroundColor: colors.background }}>
        <Text style={type.h2}>Labourer not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={{ ...type.body, fontWeight: fontWeight.heavy }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const fullName = `${labourer.firstName} ${labourer.lastName}`;
  const certs = labourer.certifications ?? ["White Card (example)", "Working at Heights (example)"];
  const exp = labourer.experienceYears ?? 3;
  const currentMonthUnavailableDates = (labourer.unavailableDates ?? [])
    .filter((d) => isCurrentMonthDate(d))
    .sort((a, b) => a.localeCompare(b));
  const currentMonthCalendarDate = getCurrentMonthAnchorIso();
  const markedDates = currentMonthUnavailableDates.reduce((acc, d) => {
    acc[d] = {
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: colors.onPrimary,
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: 60, paddingBottom: 30, gap: spacing.md }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 84 }}>
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </View>

        <View style={{ marginLeft: "auto", width: 110 }}>
          <Button label="Message" onPress={() => router.push(`/chat/${encodeURIComponent(labourer.email)}`)} />
        </View>

        {user?.role === "builder" ? (
          <Pressable
            disabled={saving}
            onPress={onToggleSaved}
            style={[
              styles.saveBtn,
              {
                backgroundColor: saved ? colors.primary : colors.field,
                borderColor: saved ? colors.borderStrong : colors.border,
                opacity: saving ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: saved ? colors.onPrimary : colors.text }}>
              {saved ? "★ Saved" : "☆ Save"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Profile card */}
      <View style={styles.card}>
        {/* Photo */}
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <View style={styles.avatar}>
            {labourer.photoUrl ? (
              <Image source={{ uri: labourer.photoUrl }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.h2, color: colors.text }}>
                  {labourer.firstName[0]}
                  {labourer.lastName[0]}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }}>{fullName}</Text>
            <Text style={type.secondary}>${labourer.pricePerHour}/hr</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={{ ...type.body, marginTop: 6 }}>{labourer.about}</Text>
        </View>

        {/* Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <Text style={{ ...type.body, marginTop: 6 }}>{exp} years</Text>
        </View>

        {/* Certifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {certs.map((c) => (
              <View key={c} style={styles.pill}>
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: colors.text }}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={{ ...type.secondary, marginTop: 6 }}>
            Unavailable this month: {currentMonthUnavailableDates.length} date(s)
          </Text>
          <View style={styles.calendarWrap}>
            <Calendar
              current={currentMonthCalendarDate}
              markedDates={markedDates}
              onMonthChange={() => {}}
              enableSwipeMonths={false}
              hideExtraDays={false}
              disableMonthChange
            />
          </View>
          {!currentMonthUnavailableDates.length ? (
            <Text style={{ ...type.secondary, marginTop: spacing.sm }}>No unavailabilities set in this month.</Text>
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

function getCurrentMonthAnchorIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginLeft: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.field,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontFamily,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.heavy,
    color: colors.text,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarWrap: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
});
