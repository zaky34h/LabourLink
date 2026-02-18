import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getOwnerReport, type OwnerReport } from "../../src/owner/storage";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sevenDaysAgoIso() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeReportHtml(report: OwnerReport) {
  const summary = report.summary;
  const offersByStatus = Object.entries(summary.offersByStatus)
    .map(([k, v]) => `<li>${escapeHtml(k)}: ${v}</li>`)
    .join("");
  const paymentsByStatus = Object.entries(summary.paymentsByStatus)
    .map(([k, v]) => `<li>${escapeHtml(k)}: ${v}</li>`)
    .join("");

  const buildersRows = report.builders
    .map(
      (b) =>
        `<tr><td>${escapeHtml(`${b.firstName} ${b.lastName}`)}</td><td>${escapeHtml(b.email)}</td><td>${escapeHtml(
          b.companyName || ""
        )}</td><td>${escapeHtml(b.address || "")}</td></tr>`
    )
    .join("");

  const labourersRows = report.labourers
    .map(
      (l) =>
        `<tr><td>${escapeHtml(`${l.firstName} ${l.lastName}`)}</td><td>${escapeHtml(l.email)}</td><td>${escapeHtml(
          l.occupation || ""
        )}</td><td>$${Number(l.pricePerHour || 0).toFixed(2)}</td></tr>`
    )
    .join("");

  const offersRows = report.offers
    .map(
      (o) =>
        `<tr><td>${escapeHtml(o.builderCompanyName || "")}</td><td>${escapeHtml(
          o.builderEmail
        )}</td><td>${escapeHtml(o.labourerEmail)}</td><td>${escapeHtml(o.startDate)} to ${escapeHtml(
          o.endDate
        )}</td><td>${escapeHtml(o.status)}</td></tr>`
    )
    .join("");

  const paymentsRows = report.payments
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.builderCompanyName || "")}</td><td>${escapeHtml(
          p.builderEmail
        )}</td><td>${escapeHtml(p.labourerEmail)}</td><td>$${Number(p.amountOwed || 0).toFixed(
          2
        )}</td><td>${escapeHtml(p.status)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial; color:#111; padding:20px;">
    <h1>LabourLink Owner Report</h1>
    <p><strong>Date range:</strong> ${escapeHtml(report.dateRange.from)} to ${escapeHtml(report.dateRange.to)}</p>
    <h2>Summary</h2>
    <ul>
      <li>Builders signed up: ${summary.buildersSignedUp}</li>
      <li>Labourers signed up: ${summary.labourersSignedUp}</li>
      <li>Offers sent: ${summary.offersSent}</li>
      <li>Payments created: ${summary.paymentsCreated}</li>
      <li>Total payment amount: $${Number(summary.totalPaymentAmount || 0).toFixed(2)}</li>
    </ul>
    <p><strong>Offers by status:</strong></p>
    <ul>${offersByStatus || "<li>None</li>"}</ul>
    <p><strong>Payments by status:</strong></p>
    <ul>${paymentsByStatus || "<li>None</li>"}</ul>

    <h2>Builders</h2>
    <table width="100%" border="1" cellspacing="0" cellpadding="6">
      <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Address</th></tr></thead>
      <tbody>${buildersRows || `<tr><td colspan="4">No data</td></tr>`}</tbody>
    </table>

    <h2>Labourers</h2>
    <table width="100%" border="1" cellspacing="0" cellpadding="6">
      <thead><tr><th>Name</th><th>Email</th><th>Occupation</th><th>Rate</th></tr></thead>
      <tbody>${labourersRows || `<tr><td colspan="4">No data</td></tr>`}</tbody>
    </table>

    <h2>Offers</h2>
    <table width="100%" border="1" cellspacing="0" cellpadding="6">
      <thead><tr><th>Builder Company</th><th>Builder Email</th><th>Labourer Email</th><th>Date Range</th><th>Status</th></tr></thead>
      <tbody>${offersRows || `<tr><td colspan="5">No data</td></tr>`}</tbody>
    </table>

    <h2>Payments</h2>
    <table width="100%" border="1" cellspacing="0" cellpadding="6">
      <thead><tr><th>Builder Company</th><th>Builder Email</th><th>Labourer Email</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${paymentsRows || `<tr><td colspan="5">No data</td></tr>`}</tbody>
    </table>
  </body>
</html>`;
}

export default function OwnerReports() {
  const [fromDate, setFromDate] = useState(sevenDaysAgoIso());
  const [toDate, setToDate] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OwnerReport | null>(null);

  async function onGenerateReport() {
    if (loading) return;
    setLoading(true);
    try {
      const data = await getOwnerReport(fromDate.trim(), toDate.trim());
      setReport(data);
      Alert.alert("Report generated", "You can now export PDF.");
    } catch (error: any) {
      Alert.alert("Could not generate report", error?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onExportPdf() {
    if (!report) return Alert.alert("Generate report first", "Pick a date range and generate report first.");
    try {
      const html = makeReportHtml(report);
      const file = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(file.uri);
    } catch (error: any) {
      Alert.alert("Could not export PDF", error?.message || "Try again.");
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, gap: 12 }}
    >
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Reports</Text>
      <Text style={{ opacity: 0.75 }}>Choose date range and export owner report PDF (no IDs included).</Text>

      <Field label="From Date (YYYY-MM-DD)" value={fromDate} onChangeText={setFromDate} />
      <Field label="To Date (YYYY-MM-DD)" value={toDate} onChangeText={setToDate} />

      <Pressable
        onPress={onGenerateReport}
        disabled={loading}
        style={{
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          backgroundColor: loading ? "#444" : "#111",
        }}
      >
        <Text style={{ color: "#FDE047", fontWeight: "900" }}>
          {loading ? "Generating..." : "Generate Report"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onExportPdf}
        style={{
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#111111",
          backgroundColor: "#FEF08A",
        }}
      >
        <Text style={{ fontWeight: "900" }}>Export PDF</Text>
      </Pressable>

      {report ? (
        <View style={{ borderWidth: 1, borderColor: "#111111", borderRadius: 12, padding: 12, marginTop: 6 }}>
          <Text style={{ fontWeight: "900", marginBottom: 6 }}>Summary</Text>
          <Text>Builders signed up: {report.summary.buildersSignedUp}</Text>
          <Text>Labourers signed up: {report.summary.labourersSignedUp}</Text>
          <Text>Offers sent: {report.summary.offersSent}</Text>
          <Text>Payments created: {report.summary.paymentsCreated}</Text>
          <Text>Total payment amount: ${report.summary.totalPaymentAmount.toFixed(2)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700" }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        style={{
          borderWidth: 1,
          borderColor: "#111111",
          borderRadius: 10,
          padding: 12,
          backgroundColor: "#fff",
        }}
      />
    </View>
  );
}
