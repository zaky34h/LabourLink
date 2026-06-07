import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, RefreshControl, Modal, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateLabourerAvailability } from "../../src/auth/updateAvailability";
import { completeWorkOffer, getOffersForLabourer, type WorkOffer } from "../../src/offers/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

export default function LabourerSchedule() {
  const { user, loading, reload } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUnavailableDates, setSelectedUnavailableDates] = useState<string[]>([]);
  const [offers, setOffers] = useState<WorkOffer[]>([]);
  const [ratingModalOffer, setRatingModalOffer] = useState<WorkOffer | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  async function loadOffers() {
    if (!user?.email || user.role !== "labourer") {
      setOffers([]);
      return;
    }
    const data = await getOffersForLabourer(user.email);
    setOffers(data);
  }

  useEffect(() => {
    if (user?.role === "labourer") {
      setSelectedUnavailableDates(user.unavailableDates ?? []);
      void loadOffers();
    }
  }, [user]);

  function toggleUnavailableDate(dateString: string) {
    setSelectedUnavailableDates((prev) =>
      prev.includes(dateString)
        ? prev.filter((d) => d !== dateString)
        : [...prev, dateString]
    );
  }

  const markedDates = useMemo(() => {
    return selectedUnavailableDates.reduce((acc, d) => {
      acc[d] = { selected: true, selectedColor: colors.primary, selectedTextColor: colors.onPrimary };
      return acc;
    }, {} as Record<string, any>);
  }, [selectedUnavailableDates]);

  async function onSave() {
    if (!user || user.role !== "labourer") return;
    setSaving(true);
    const res = await updateLabourerAvailability(user.email, selectedUnavailableDates.slice().sort());
    setSaving(false);

    if (!res.ok) return Alert.alert("Couldn’t save", res.error);
    await reload();
    Alert.alert("Saved", "Your unavailabilities have been updated.");
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([reload(), loadOffers()]);
    setRefreshing(false);
  }

  const scheduledWork = useMemo(
    () =>
      offers
        .filter((o) => o.status === "approved" || o.status === "completed")
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [offers]
  );

  async function onConfirmCompleteWork() {
    if (!ratingModalOffer) return;
    setSubmittingCompletion(true);
    const res = await completeWorkOffer(ratingModalOffer.id, selectedRating);
    setSubmittingCompletion(false);
    if (!res.ok) return Alert.alert("Couldn’t complete work", res.error);

    setRatingModalOffer(null);
    setSelectedRating(5);
    await loadOffers();
    Alert.alert("Work completed", `Thanks. You rated this company ${selectedRating}/5.`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!user || user.role !== "labourer") {
    return (
      <View style={{ flex: 1, padding: spacing.xl, paddingTop: 60, backgroundColor: colors.background }}>
        <Text style={type.h2}>Not logged in</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
    >
      <Text style={type.h1}>Schedule</Text>
      <Text style={{ ...type.secondary, marginTop: 6, lineHeight: 20 }}>
        All days are available by default. Add only your unavailabilities below.
      </Text>

      <View style={{ height: spacing.md }} />

      <View style={styles.calendarCard}>
        <Calendar
          onDayPress={(day) => toggleUnavailableDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            calendarBackground: colors.surface,
            monthTextColor: colors.text,
            textMonthFontFamily: fontFamily,
            textMonthFontWeight: "800",
            textSectionTitleColor: colors.textSecondary,
            dayTextColor: colors.text,
            textDayFontFamily: fontFamily,
            textDayHeaderFontFamily: fontFamily,
            textDisabledColor: colors.border,
            todayTextColor: colors.dangerText,
            arrowColor: colors.text,
          }}
        />
      </View>

      <Text style={{ ...type.secondary, marginTop: spacing.md, fontWeight: fontWeight.bold }}>
        Unavailabilities: {selectedUnavailableDates.length}
      </Text>

      <Button
        label="Clear Unavailabilities"
        variant="secondary"
        onPress={() => setSelectedUnavailableDates([])}
        style={{ marginTop: spacing.sm }}
      />

      <Button
        label={saving ? "Saving..." : "Save Unavailabilities"}
        onPress={onSave}
        loading={saving}
        disabled={saving}
        style={{ marginTop: spacing.md }}
      />

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Text style={type.h1}>Confirmed Work</Text>
        {scheduledWork.length === 0 ? (
          <Text style={{ ...type.secondary, lineHeight: 20 }}>
            No confirmed jobs yet. Approved offers will appear here automatically.
          </Text>
        ) : (
          scheduledWork.map((offer) => (
            <View key={offer.id} style={styles.card}>
              <Text style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }}>
                {offer.builderCompanyName}
              </Text>
              <Text style={type.secondary}>{offer.startDate} to {offer.endDate}</Text>
              <Text style={type.secondary}>{offer.siteAddress}</Text>
              {offer.status === "completed" ? (
                <Text style={{ fontFamily, marginTop: 4, fontWeight: fontWeight.heavy, color: colors.successText }}>
                  Completed • Rated {offer.labourerCompanyRating ?? "N/A"}/5
                </Text>
              ) : (
                <Button
                  label="Complete Work"
                  onPress={() => {
                    setSelectedRating(5);
                    setRatingModalOffer(offer);
                  }}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </View>
          ))
        )}
      </View>

      <Modal visible={!!ratingModalOffer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={type.h2}>Rate Company</Text>
            <Text style={{ ...type.secondary, marginTop: 6 }}>
              How would you rate {ratingModalOffer?.builderCompanyName}?
            </Text>

            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= selectedRating;
                return (
                  <Pressable
                    key={star}
                    onPress={() => setSelectedRating(star)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.field,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontFamily, color: active ? colors.onPrimary : colors.text, fontWeight: fontWeight.heavy }}>
                      {star}★
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="secondary" onPress={() => setRatingModalOffer(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={submittingCompletion ? "Saving..." : "Submit Rating"}
                  onPress={onConfirmCompleteWork}
                  loading={submittingCompletion}
                  disabled={submittingCompletion}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: "hidden",
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
});
