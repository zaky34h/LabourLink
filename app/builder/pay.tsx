import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { generateReceiptPdf, getBuilderPayments, markPaymentPaid, type PaymentRecord, updatePayment } from "../../src/payments/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";
import TextField from "../../src/ui/TextField";

function cleanPaymentDetails(details: string) {
  return String(details || "")
    .replace(/^Work offer\s+[^:]+:\s*/i, "")
    .trim();
}

export default function BuilderPay() {
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedTab, setSelectedTab] = useState<"pending" | "paid">("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState("");
  const [detailsDraft, setDetailsDraft] = useState("");

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    const data = await getBuilderPayments();
    setPayments(data);
    if (!silent) setLoading(false);
    loadedRef.current = true;
  }

  useFocusEffect(useCallback(() => { void load({ silent: loadedRef.current }); }, []));

  const pending = useMemo(() => payments.filter((p) => p.status === "pending"), [payments]);
  const paid = useMemo(() => payments.filter((p) => p.status === "paid"), [payments]);
  const visible = selectedTab === "pending" ? pending : paid;

  async function onSaveEdit(payment: PaymentRecord) {
    const amount = Number(amountDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      return Alert.alert("Invalid amount", "Amount owed must be greater than 0.");
    }
    const details = detailsDraft.trim();
    if (!details) return Alert.alert("Missing details", "Please enter payment details.");

    const res = await updatePayment(payment.id, { amountOwed: amount, details });
    if (!res.ok) return Alert.alert("Couldn’t update", res.error);
    setEditingId(null);
    await load();
  }

  async function onMarkPaid(payment: PaymentRecord) {
    const res = await markPaymentPaid(payment.id);
    if (!res.ok) return Alert.alert("Couldn’t mark paid", res.error);
    await load();
    Alert.alert("Marked as paid", "Receipt is now available for both builder and labourer.");
  }

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
      renderItem={({ item }) => {
        const editing = editingId === item.id;
        return (
          <View style={styles.card}>
            <Text style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }}>
              {item.labourerName}
            </Text>
            <Text style={{ ...type.secondary, marginTop: 4 }}>BSB: {item.labourerBsb || "Not set"}</Text>
            <Text style={{ ...type.secondary, marginTop: 2 }}>Account: {item.labourerAccountNumber || "Not set"}</Text>

            {editing ? (
              <View style={{ marginTop: spacing.sm }}>
                <TextField
                  value={amountDraft}
                  onChangeText={setAmountDraft}
                  keyboardType="numeric"
                  placeholder="Amount owed"
                />
                <TextField
                  value={detailsDraft}
                  onChangeText={setDetailsDraft}
                  placeholder="Details"
                />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button label="Save" onPress={() => onSaveEdit(item)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Cancel" variant="secondary" onPress={() => setEditingId(null)} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text style={{ fontFamily, fontSize: fontSize.h2, fontWeight: fontWeight.heavy, color: colors.text, marginTop: 8 }}>
                  ${item.amountOwed.toFixed(2)}
                </Text>
                <Text style={{ ...type.secondary, marginTop: 4 }}>{cleanPaymentDetails(item.details)}</Text>
                <View style={[styles.pill, { backgroundColor: item.status === "paid" ? colors.successBg : colors.pendingBg, marginTop: 10 }]}>
                  <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.caption, color: item.status === "paid" ? colors.successText : colors.pendingText }}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                  {item.status === "pending" ? (
                    <>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Edit"
                          variant="secondary"
                          onPress={() => {
                            setEditingId(item.id);
                            setAmountDraft(String(item.amountOwed));
                            setDetailsDraft(item.details);
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button label="Mark Paid" onPress={() => onMarkPaid(item)} />
                      </View>
                    </>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Button label="View Receipt" onPress={() => onViewReceipt(item)} />
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        );
      }}
    />
    </KeyboardAvoidingView>
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
