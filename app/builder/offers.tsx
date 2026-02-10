import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Modal, ScrollView, Alert, Linking } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import {
  getOffersForBuilder,
  regenerateWorkOfferPdf,
  type WorkOffer,
  type WorkOfferStatus,
} from "../../src/offers/storage";

function extractShiftRange(notes: string) {
  const match = String(notes || "").match(/Shift:\s*([0-2]?\d:\d{2})\s*-\s*([0-2]?\d:\d{2})/i);
  return match ? `${match[1]} - ${match[2]}` : "Not specified";
}

function removeShiftFromNotes(notes: string) {
  const cleaned = String(notes || "")
    .replace(/Shift:\s*[0-2]?\d:\d{2}\s*-\s*[0-2]?\d:\d{2}\s*/i, "")
    .trim();
  return cleaned || "None";
}

export default function BuilderOffers() {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<WorkOffer[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<WorkOfferStatus>("pending");
  const [selectedOffer, setSelectedOffer] = useState<WorkOffer | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!user?.email || user.role !== "builder") {
      setOffers([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const data = await getOffersForBuilder(user.email);
    setOffers(data);
    if (!silent) setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.email])
  );

  const filtered = useMemo(
    () =>
      offers.filter((o) =>
        selectedStatus === "approved"
          ? o.status === "approved" || o.status === "completed"
          : o.status === selectedStatus
      ),
    [offers, selectedStatus]
  );

  async function ensurePdfUri(offer: WorkOffer): Promise<string | null> {
    if (offer.pdfUri) return offer.pdfUri;
    const regenerated = await regenerateWorkOfferPdf(offer.id);
    if (!regenerated.ok) {
      Alert.alert("PDF error", regenerated.error);
      return null;
    }
    setSelectedOffer(regenerated.offer);
    await load();
    return regenerated.offer.pdfUri ?? null;
  }

  async function openPdf(offer: WorkOffer) {
    setPdfBusy(true);
    try {
      const uri = await ensurePdfUri(offer);
      if (!uri) return;
      await Linking.openURL(uri);
    } catch {
      Alert.alert("Couldn’t open PDF", "Please try regenerating the PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function sharePdf(offer: WorkOffer) {
    setPdfBusy(true);
    try {
      const uri = await ensurePdfUri(offer);
      if (!uri) return;
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Sharing unavailable", "This device does not support file sharing.");
        return;
      }
      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Couldn’t share PDF", "Please try regenerating the PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        style={{ flex: 1, backgroundColor: "#fff" }}
        contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: 24, fontWeight: "900" }}>Offers</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <FilterButton
                label="Pending"
                active={selectedStatus === "pending"}
                onPress={() => setSelectedStatus("pending")}
              />
              <FilterButton
                label="Declined"
                active={selectedStatus === "declined"}
                onPress={() => setSelectedStatus("declined")}
              />
              <FilterButton
                label="Approved"
                active={selectedStatus === "approved"}
                onPress={() => setSelectedStatus("approved")}
              />
            </View>
            <View style={{ height: 12 }} />
          </View>
        }
        ListEmptyComponent={
          <Text style={{ marginTop: 24, opacity: 0.7, fontWeight: "700" }}>
            No {selectedStatus} offers yet.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedOffer(item)}
            style={{
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 16 }}>{item.labourerName}</Text>
            <Text style={{ marginTop: 4, opacity: 0.8 }}>
              {item.startDate} to {item.endDate}
            </Text>
            <Text style={{ marginTop: 4, opacity: 0.8 }}>
              ${item.rate}/hr • Est {item.estimatedHours}h
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
              Created {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!selectedOffer} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "85%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Offer Details</Text>
              <Pressable onPress={() => setSelectedOffer(null)}>
                <Text style={{ fontWeight: "900" }}>Done</Text>
              </Pressable>
            </View>

            {selectedOffer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Detail label="Labourer" value={selectedOffer.labourerName} />
                <Detail label="Status" value={selectedOffer.status.toUpperCase()} />
                <Detail label="Date Range" value={`${selectedOffer.startDate} to ${selectedOffer.endDate}`} />
                <Detail label="Hours" value={extractShiftRange(selectedOffer.notes)} />
                <Detail label="Rate" value={`$${selectedOffer.rate}/hr`} />
                <Detail label="Estimated Hours" value={`${selectedOffer.estimatedHours}`} />
                <Detail label="Site Address" value={selectedOffer.siteAddress} />
                <Detail label="Notes" value={removeShiftFromNotes(selectedOffer.notes)} />
                <Detail label="Labourer Signature" value={selectedOffer.labourerSignature || "Pending"} />

                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Pressable
                    onPress={() => openPdf(selectedOffer)}
                    disabled={pdfBusy}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: "#111111",
                      borderRadius: 10,
                      alignItems: "center",
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>{pdfBusy ? "Working..." : "Open PDF"}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => sharePdf(selectedOffer)}
                    disabled={pdfBusy}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: "#111111",
                      borderRadius: 10,
                      alignItems: "center",
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>Share / Download</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={async () => {
                    setPdfBusy(true);
                    const regenerated = await regenerateWorkOfferPdf(selectedOffer.id);
                    setPdfBusy(false);
                    if (!regenerated.ok) return Alert.alert("Couldn’t regenerate PDF", regenerated.error);
                    setSelectedOffer(regenerated.offer);
                    await load();
                    Alert.alert("PDF regenerated", "A new PDF file has been created.");
                  }}
                  disabled={pdfBusy}
                  style={{ marginTop: 10, alignItems: "center", paddingVertical: 8 }}
                >
                  <Text style={{ fontWeight: "800", textDecorationLine: "underline" }}>Regenerate PDF</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
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
      <Text style={{ fontWeight: "900", color: active ? "#FDE047" : "#111111" }}>{label}</Text>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontWeight: "900", fontSize: 16 }}>{label}</Text>
      <Text style={{ opacity: 0.9, marginTop: 4, fontSize: 17 }}>{value}</Text>
    </View>
  );
}
