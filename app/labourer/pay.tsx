import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { generateReceiptPdf, getLabourerPayments, type PaymentRecord } from "../../src/payments/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

function cleanPaymentDetails(details: string) {
  return String(details || "")
    .replace(/^Work offer\s+[^:]+:\s*/i, "")
    .trim();
}

export default function LabourerPay() {
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedTab, setSelectedTab] = useState<"pending" | "paid">("pending");

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    const data = await getLabourerPayments();
    setPayments(data);
    if (!silent) setLoading(false);
    loadedRef.current = true;
  }

  useFocusEffect(useCallback(() => { void load({ silent: loadedRef.current }); }, []));

  const pending = useMemo(() => payments.filter((p) => p.status === "pending"), [payments]);
  const paid = useMemo(() => payments.filter((p) => p.status === "paid"), [payments]);
  const visible = selectedTab === "pending" ? pending : paid;

  async function onViewReceipt(payment: PaymentRecord) {
    const res = await generateReceiptPdf(payment);
    if (!res.ok) return Alert.alert("Couldn’t generate receipt", res.error);
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return Alert.alert("Unavailable", "Sharing is not available on this device.");
    await Sharing.shareAsync(res.uri);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm }}
      data={visible}
      keyExtractor={(p) => p.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          <Text style={type.h1}>Pay</Text>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setSelectedTab("pending")}
              style={[styles.segmentItem, selectedTab === "pending" && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentLabel, { color: selectedTab === "pending" ? colors.onPrimary : colors.textSecondary }]}>
                Pending
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedTab("paid")}
              style={[styles.segmentItem, selectedTab === "paid" && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentLabel, { color: selectedTab === "paid" ? colors.onPrimary : colors.textSecondary }]}>
                Paid
              </Text>
            </Pressable>
          </View>
          <View style={{ height: spacing.md }} />
        </View>
      }
      ListEmptyComponent={<Text style={{ ...type.secondary }}>No payment items yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }}>
            {item.builderCompanyName}
          </Text>
          <Text style={{ fontFamily, fontSize: fontSize.h2, fontWeight: fontWeight.heavy, color: colors.text, marginTop: 8 }}>
            ${item.amountOwed.toFixed(2)}
          </Text>
          <Text style={{ ...type.secondary, marginTop: 4 }}>{cleanPaymentDetails(item.details)}</Text>
          <View style={[styles.pill, { backgroundColor: item.status === "paid" ? colors.successBg : colors.pendingBg, marginTop: 10 }]}>
            <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.caption, color: item.status === "paid" ? colors.successText : colors.pendingText }}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          {item.status === "paid" ? (
            <Button label="View Receipt" onPress={() => onViewReceipt(item)} style={{ marginTop: spacing.md }} />
          ) : null}
        </View>
      )}
    />
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
  segmentLabel: { fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.body },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
});
