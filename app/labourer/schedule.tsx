import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, RefreshControl, Modal } from "react-native";
import { Calendar } from "react-native-calendars";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateLabourerAvailability } from "../../src/auth/updateAvailability";
import { completeWorkOffer, getOffersForLabourer, type WorkOffer } from "../../src/offers/storage";

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
      acc[d] = { selected: true, selectedColor: "#111", selectedTextColor: "#FDE047" };
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
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Schedule</Text>
      <Text style={{ marginTop: 6, opacity: 0.7 }}>
        All days are available by default. Add only your unavailabilities below.
      </Text>

      <View style={{ height: 14 }} />

      <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#111111", padding: 10 }}>
        <Calendar onDayPress={(day) => toggleUnavailableDate(day.dateString)} markedDates={markedDates} />
      </View>

      <Text style={{ marginTop: 12, opacity: 0.7, fontWeight: "700" }}>
        Unavailabilities: {selectedUnavailableDates.length}
      </Text>

      <Pressable
        onPress={() => setSelectedUnavailableDates([])}
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
        <Text style={{ fontWeight: "800" }}>Clear Unavailabilities</Text>
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
          {saving ? "Saving..." : "Save Unavailabilities"}
        </Text>
      </Pressable>

      <View style={{ marginTop: 24, gap: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: "900" }}>Confirmed Work</Text>
        {scheduledWork.length === 0 ? (
          <Text style={{ opacity: 0.7, fontWeight: "700" }}>
            No confirmed jobs yet. Approved offers will appear here automatically.
          </Text>
        ) : (
          scheduledWork.map((offer) => (
            <View
              key={offer.id}
              style={{
                borderWidth: 1,
                borderColor: "#111111",
                borderRadius: 14,
                padding: 12,
                backgroundColor: "#fff",
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "900" }}>{offer.builderCompanyName}</Text>
              <Text style={{ opacity: 0.8 }}>{offer.startDate} to {offer.endDate}</Text>
              <Text style={{ opacity: 0.8 }}>{offer.siteAddress}</Text>
              {offer.status === "completed" ? (
                <Text style={{ marginTop: 4, fontWeight: "800", color: "#166534" }}>
                  Completed • Rated {offer.labourerCompanyRating ?? "N/A"}/5
                </Text>
              ) : (
                <Pressable
                  onPress={() => {
                    setSelectedRating(5);
                    setRatingModalOffer(offer);
                  }}
                  style={{
                    marginTop: 6,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: "#111",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#FDE047", fontWeight: "900" }}>Complete Work</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </View>

      <Modal visible={!!ratingModalOffer} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "900" }}>Rate Company</Text>
            <Text style={{ marginTop: 6, opacity: 0.75 }}>
              How would you rate {ratingModalOffer?.builderCompanyName}?
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= selectedRating;
                return (
                  <Pressable
                    key={star}
                    onPress={() => setSelectedRating(star)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#111111",
                      backgroundColor: active ? "#111" : "#fff",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: active ? "#FDE047" : "#111111", fontWeight: "900" }}>
                      {star}★
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setRatingModalOffer(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#111111",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirmCompleteWork}
                disabled={submittingCompletion}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#111",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FDE047", fontWeight: "900" }}>
                  {submittingCompletion ? "Saving..." : "Submit Rating"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
