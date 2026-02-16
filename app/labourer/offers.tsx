import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import {
  getOffersForLabourer,
  regenerateWorkOfferPdf,
  respondToWorkOffer,
  type WorkOffer,
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

export default function LabourerOffers() {
  const { user } = useCurrentUser();
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<WorkOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<WorkOffer | null>(null);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<WorkOffer["status"]>("pending");

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!user?.email || user.role !== "labourer") {
      setOffers([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const data = await getOffersForLabourer(user.email);
    setOffers(data);
    if (!silent) setLoading(false);
    loadedRef.current = true;
  }

  async function onRefresh() {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      void load({ silent: loadedRef.current });
    }, [user?.email])
  );

  async function respond(status: "approved" | "declined") {
    if (!selectedOffer || !user?.email || user.role !== "labourer") return;

    setSubmitting(true);
    const res = await respondToWorkOffer(selectedOffer.id, user.email, status, signature);
    setSubmitting(false);
    if (!res.ok) return Alert.alert("Couldn’t submit response", res.error);

    await load();
    setSelectedOffer(null);
    setSignature("");
    Alert.alert("Submitted", `Offer ${status}.`);
  }

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

  const filtered = useMemo(
    () =>
      offers.filter((o) =>
        selectedStatus === "approved"
          ? o.status === "approved" || o.status === "completed"
          : o.status === selectedStatus
      ),
    [offers, selectedStatus]
  );

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
                label="Signed"
                active={selectedStatus === "approved"}
                onPress={() => setSelectedStatus("approved")}
              />
              <FilterButton
                label="Declined"
                active={selectedStatus === "declined"}
                onPress={() => setSelectedStatus("declined")}
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
            onPress={() => {
              setSelectedOffer(item);
              setSignature("");
            }}
            style={{
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              backgroundColor: "#fff",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "900", fontSize: 16 }}>{item.builderCompanyName}</Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={{ marginTop: 4, opacity: 0.8 }}>
              {item.startDate} to {item.endDate}
            </Text>
            <Text style={{ marginTop: 4, opacity: 0.8 }}>
              ${item.rate}/hr • Est {item.estimatedHours}h
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
              Received {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!selectedOffer} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "85%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Offer Details</Text>
              <Pressable
                onPress={() => {
                  setSelectedOffer(null);
                  setSignature("");
                }}
              >
                <Text style={{ fontWeight: "900" }}>Done</Text>
              </Pressable>
            </View>

            {selectedOffer && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              >
                <Detail label="Builder" value={selectedOffer.builderCompanyName} />
                <Detail label="Status" value={selectedOffer.status.toUpperCase()} />
                <Detail label="Date Range" value={`${selectedOffer.startDate} to ${selectedOffer.endDate}`} />
                <Detail label="Hours" value={extractShiftRange(selectedOffer.notes)} />
                <Detail label="Rate" value={`$${selectedOffer.rate}/hr`} />
                <Detail label="Estimated Hours" value={`${selectedOffer.estimatedHours}`} />
                <Detail label="Site Address" value={selectedOffer.siteAddress} />
                <Detail label="Notes" value={removeShiftFromNotes(selectedOffer.notes)} />

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

                {selectedOffer.status === "pending" ? (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontWeight: "800" }}>Signature (type your full name)</Text>
                      <TextInput
                        value={signature}
                        onChangeText={setSignature}
                        placeholder="Your full name"
                        style={{
                          borderWidth: 1,
                          borderColor: "#111111",
                          borderRadius: 10,
                          padding: 12,
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={() => respond("declined")}
                        disabled={submitting}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: "#111111",
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontWeight: "900" }}>
                          {submitting ? "Submitting..." : "Decline"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => respond("approved")}
                        disabled={submitting}
                        style={{
                          flex: 1,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: "center",
                          backgroundColor: "#111",
                        }}
                      >
                        <Text style={{ color: "#FDE047", fontWeight: "900" }}>
                          {submitting ? "Submitting..." : "Sign & Approve"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text style={{ marginTop: 12, opacity: 0.7, fontWeight: "700" }}>
                    You already responded to this offer.
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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

function StatusPill({ status }: { status: WorkOffer["status"] }) {
  const colors =
    status === "approved"
      ? { bg: "#DCFCE7", text: "#166534" }
      : status === "declined"
        ? { bg: "#FEE2E2", text: "#991B1B" }
        : { bg: "#FEF08A", text: "#111111" };

  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.bg }}>
      <Text style={{ fontWeight: "900", color: colors.text, fontSize: 12 }}>
        {status.toUpperCase()}
      </Text>
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
