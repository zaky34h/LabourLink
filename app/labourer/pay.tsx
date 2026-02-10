import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { generateReceiptPdf, getLabourerPayments, type PaymentRecord } from "../../src/payments/storage";

export default function LabourerPay() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedTab, setSelectedTab] = useState<"pending" | "paid">("pending");

  async function load() {
    setLoading(true);
    const data = await getLabourerPayments();
    setPayments(data);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

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
          <Text style={{ marginTop: 4, opacity: 0.7, fontWeight: "700" }}>
            Pending: {pending.length} • Paid: {paid.length}
          </Text>
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
      renderItem={({ item }) => (
        <View style={{ borderWidth: 1, borderColor: "#111111", borderRadius: 14, padding: 12, marginBottom: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: "900" }}>{item.builderCompanyName}</Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>Offer: {item.offerId}</Text>
          <Text style={{ marginTop: 8, fontWeight: "900" }}>${item.amountOwed.toFixed(2)}</Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>{item.details}</Text>
          <Text style={{ marginTop: 6, fontWeight: "800", color: item.status === "paid" ? "#166534" : "#B45309" }}>
            {item.status.toUpperCase()}
          </Text>
          {item.status === "paid" ? (
            <Pressable
              onPress={() => onViewReceipt(item)}
              style={{
                marginTop: 10,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: "#111",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FDE047", fontWeight: "900" }}>View Receipt</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );
}
