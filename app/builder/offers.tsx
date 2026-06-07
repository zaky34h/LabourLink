import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Modal, ScrollView, Alert, Linking, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import {
  getOffersForBuilder,
  regenerateWorkOfferPdf,
  type WorkOffer,
  type WorkOfferStatus,
} from "../../src/offers/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

function extractShiftRange(notes: string) {
  const match = String(notes || "").match(/Shift:\s*([0-9]{1,2}:\d{2}(?:\s*[AaPp][Mm])?)\s*-\s*([0-9]{1,2}:\d{2}(?:\s*[AaPp][Mm])?)/);
  if (!match) return "Not specified";
  const start = parseTimeToMinutes(match[1]);
  const end = parseTimeToMinutes(match[2]);
  if (start === null || end === null) return "Not specified";
  return `${formatMinutesTo12Hour(start)} - ${formatMinutesTo12Hour(end)}`;
}

function parseTimeToMinutes(v: string) {
  const value = v.trim().toLowerCase().replace(/\s+/g, " ");
  const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/);
  if (ampmMatch) {
    const h = Number(ampmMatch[1]);
    const m = Number(ampmMatch[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    const isPm = ampmMatch[3] === "pm";
    const hour24 = (h % 12) + (isPm ? 12 : 0);
    return hour24 * 60 + m;
  }

  const match24 = value.match(/^([0-1]?\d|2[0-3]):(\d{2})$/);
  if (!match24) return null;
  const h = Number(match24[1]);
  const m = Number(match24[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function formatMinutesTo12Hour(minutes: number) {
  const clamped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(clamped / 60);
  const minute = String(clamped % 60).padStart(2, "0");
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${isPm ? "PM" : "AM"}`;
}

function removeShiftFromNotes(notes: string) {
  const cleaned = String(notes || "")
    .replace(/Shift:\s*[0-9]{1,2}:\d{2}(?:\s*[AaPp][Mm])?\s*-\s*[0-9]{1,2}:\d{2}(?:\s*[AaPp][Mm])?\s*/i, "")
    .trim();
  return cleaned || "None";
}

export default function BuilderOffers() {
  const { user } = useCurrentUser();
  const loadedRef = useRef(false);
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
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View>
            <Text style={type.h1}>Offers</Text>
            <View style={styles.segment}>
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
            <View style={{ height: spacing.md }} />
          </View>
        }
        ListEmptyComponent={
          <Text style={{ ...type.secondary, marginTop: spacing.md }}>
            No {selectedStatus} offers yet.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedOffer(item)}
            style={styles.card}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.h3, color: colors.text, flex: 1 }}>
                {item.labourerName}
              </Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={{ ...type.secondary, marginTop: 4 }}>
              {item.startDate} to {item.endDate}
            </Text>
            <Text style={{ ...type.secondary, marginTop: 4 }}>
              ${item.rate}/hr • Est {item.estimatedHours}h
            </Text>
            <Text style={{ ...type.secondary, marginTop: 6, fontSize: fontSize.caption }}>
              Created {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!selectedOffer} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
              <Text style={type.h2}>Offer Details</Text>
              <Pressable onPress={() => setSelectedOffer(null)}>
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: colors.text }}>Done</Text>
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

                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Button label={pdfBusy ? "Working..." : "Open PDF"} variant="secondary" onPress={() => openPdf(selectedOffer)} disabled={pdfBusy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Share / Download" variant="secondary" onPress={() => sharePdf(selectedOffer)} disabled={pdfBusy} />
                  </View>
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
                  style={{ marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm }}
                >
                  <Text style={{ fontFamily, fontWeight: fontWeight.bold, color: colors.text, textDecorationLine: "underline" }}>
                    Regenerate PDF
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatusPill({ status }: { status: WorkOffer["status"] }) {
  const tone =
    status === "approved" || status === "completed"
      ? { bg: colors.successBg, text: colors.successText }
      : status === "declined"
        ? { bg: colors.dangerBg, text: colors.dangerText }
        : { bg: colors.pendingBg, text: colors.pendingText };

  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: tone.bg, marginLeft: spacing.sm }}>
      <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: tone.text, fontSize: fontSize.caption }}>
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
    <Pressable onPress={onPress} style={[styles.segmentItem, active && styles.segmentItemActive]}>
      <Text style={[styles.segmentLabel, { color: active ? colors.onPrimary : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={{ fontFamily, fontSize: fontSize.h3, color: colors.text, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  segment: {
    flexDirection: "row",
    marginTop: spacing.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: radii.md, alignItems: "center" },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentLabel: { fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.label },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "85%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
  fieldLabel: {
    fontFamily,
    fontSize: fontSize.eyebrow,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
});
