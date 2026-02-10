import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, TextInput } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { generateReceiptPdf, getBuilderPayments, markPaymentPaid, type PaymentRecord, updatePayment } from "../../src/payments/storage";

function cleanPaymentDetails(details: string) {
  return String(details || "")
    .replace(/^Work offer\s+[^:]+:\s*/i, "")
    .trim();
}

export default function BuilderPay() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedTab, setSelectedTab] = useState<"pending" | "paid">("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState("");
  const [detailsDraft, setDetailsDraft] = useState("");

  async function load() {
    setLoading(true);
    const data = await getBuilderPayments();
    setPayments(data);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}
      data={visible}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View>
          <Text style={{ fontSize: 24, fontWeight: "900" }}>Pay</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={() => setSelectedTab("pending")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111111",
                backgroundColor: selectedTab === "pending" ? "#111" : "#fff",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: selectedTab === "pending" ? "#FDE047" : "#111111" }}>
                Pending
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedTab("paid")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#111111",
                backgroundColor: selectedTab === "paid" ? "#111" : "#fff",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: selectedTab === "paid" ? "#FDE047" : "#111111" }}>
                Paid
              </Text>
            </Pressable>
          </View>
          <View style={{ height: 12 }} />
        </View>
      }
      ListEmptyComponent={<Text style={{ opacity: 0.7, fontWeight: "700" }}>No payment items yet.</Text>}
      renderItem={({ item }) => {
        const editing = editingId === item.id;
        return (
          <View style={{ borderWidth: 1, borderColor: "#111111", borderRadius: 14, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: "900" }}>{item.labourerName}</Text>
            <Text style={{ marginTop: 4, opacity: 0.8 }}>BSB: {item.labourerBsb || "Not set"}</Text>
            <Text style={{ marginTop: 2, opacity: 0.8 }}>Account: {item.labourerAccountNumber || "Not set"}</Text>

            {editing ? (
              <View style={{ marginTop: 8, gap: 8 }}>
                <TextInput
                  value={amountDraft}
                  onChangeText={setAmountDraft}
                  keyboardType="numeric"
                  placeholder="Amount owed"
                  style={{ borderWidth: 1, borderColor: "#111111", borderRadius: 10, padding: 10 }}
                />
                <TextInput
                  value={detailsDraft}
                  onChangeText={setDetailsDraft}
                  placeholder="Details"
                  style={{ borderWidth: 1, borderColor: "#111111", borderRadius: 10, padding: 10 }}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={() => onSaveEdit(item)} style={btnPrimary}>
                    <Text style={btnPrimaryText}>Save</Text>
                  </Pressable>
                  <Pressable onPress={() => setEditingId(null)} style={btnSecondary}>
                    <Text style={btnSecondaryText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Text style={{ marginTop: 8, fontWeight: "900" }}>${item.amountOwed.toFixed(2)}</Text>
                <Text style={{ marginTop: 4, opacity: 0.8 }}>{cleanPaymentDetails(item.details)}</Text>
                <Text style={{ marginTop: 4, fontWeight: "800", color: item.status === "paid" ? "#166534" : "#B45309" }}>
                  {item.status.toUpperCase()}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  {item.status === "pending" ? (
                    <>
                      <Pressable
                        onPress={() => {
                          setEditingId(item.id);
                          setAmountDraft(String(item.amountOwed));
                          setDetailsDraft(item.details);
                        }}
                        style={btnSecondary}
                      >
                        <Text style={btnSecondaryText}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => onMarkPaid(item)} style={btnPrimary}>
                        <Text style={btnPrimaryText}>Mark Paid</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable onPress={() => onViewReceipt(item)} style={btnPrimary}>
                      <Text style={btnPrimaryText}>View Receipt</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        );
      }}
    />
  );
}

const btnPrimary = {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 10,
  backgroundColor: "#111",
  alignItems: "center" as const,
};
const btnPrimaryText = { color: "#FDE047", fontWeight: "900" as const };
const btnSecondary = {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#111111",
  alignItems: "center" as const,
};
const btnSecondaryText = { fontWeight: "900" as const };
