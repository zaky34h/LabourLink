import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { Asset } from "expo-asset";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getOwnerReport, type OwnerReport } from "../../src/owner/storage";

let cachedLogoUri: string | null | undefined;

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

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(epochMs: number) {
  if (!Number.isFinite(epochMs)) return "-";
  return new Date(epochMs).toLocaleString();
}

async function getReportLogoUri() {
  if (cachedLogoUri !== undefined) return cachedLogoUri;
  try {
    const asset = Asset.fromModule(require("../../assets/labourlink-logo.png"));
    if (!asset.localUri) await asset.downloadAsync();
    cachedLogoUri = asset.localUri ?? asset.uri ?? null;
  } catch {
    cachedLogoUri = null;
  }
  return cachedLogoUri;
}

function statusBadges(map: Record<string, number>) {
  const items = Object.entries(map);
  if (!items.length) return `<span class="pill">None</span>`;
  return items
    .map(([k, v]) => `<span class="pill">${escapeHtml(k)}: ${v}</span>`)
    .join("");
}

function makeReportHtml(report: OwnerReport, logoUri?: string | null) {
  const summary = report.summary;

  const buildersRows = report.builders
    .map(
      (b) =>
        `<tr><td>${escapeHtml(`${b.firstName} ${b.lastName}`)}</td><td>${escapeHtml(b.email)}</td><td>${escapeHtml(
          b.companyName || "-"
        )}</td><td>${escapeHtml(b.address || "-")}</td><td>${escapeHtml(formatDateTime(b.createdAt))}</td></tr>`
    )
    .join("");

  const labourersRows = report.labourers
    .map(
      (l) =>
        `<tr><td>${escapeHtml(`${l.firstName} ${l.lastName}`)}</td><td>${escapeHtml(l.email)}</td><td>${escapeHtml(
          l.occupation || "-"
        )}</td><td>${money(l.pricePerHour)}</td><td>${escapeHtml(String(l.experienceYears || 0))} yrs</td></tr>`
    )
    .join("");

  const offersRows = report.offers
    .map(
      (o) =>
        `<tr><td>${escapeHtml(o.builderCompanyName || "-")}</td><td>${escapeHtml(
          o.builderEmail
        )}</td><td>${escapeHtml(o.labourerEmail)}</td><td>${escapeHtml(o.startDate)} to ${escapeHtml(
          o.endDate
        )}</td><td>${escapeHtml(o.status)}</td></tr>`
    )
    .join("");

  const paymentsRows = report.payments
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.builderCompanyName || "-")}</td><td>${escapeHtml(
          p.builderEmail
        )}</td><td>${escapeHtml(p.labourerEmail)}</td><td>${money(p.amountOwed)}</td><td>${escapeHtml(
          p.status
        )}</td><td>${escapeHtml(formatDateTime(p.createdAt))}</td></tr>`
    )
    .join("");

  const logoBlock = logoUri
    ? `<img class="brand-logo" src="${escapeHtml(logoUri)}" alt="LabourLink Logo" />`
    : `<div class="brand-logo-fallback">LabourLink</div>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border: 2px solid #111;
        border-radius: 16px;
        padding: 14px;
        background: linear-gradient(135deg, #fff8d9, #ffffff);
      }
      .brand-logo { width: 220px; height: 100px; object-fit: contain; }
      .brand-logo-fallback {
        width: 220px;
        height: 100px;
        border: 1px solid #111;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding-left: 12px;
        font-weight: 900;
      }
      .title { margin: 0; font-size: 32px; line-height: 1; }
      .subtitle { margin: 8px 0 0 0; color: #555; font-size: 12px; }
      .range { margin-top: 10px; font-size: 13px; font-weight: 700; }

      .section { margin-top: 16px; border: 1px solid #111; border-radius: 14px; overflow: hidden; }
      .section-title { margin: 0; padding: 10px 12px; font-size: 16px; background: #111; color: #fef08a; }
      .section-body { padding: 12px; }

      .cards { display: flex; gap: 10px; flex-wrap: wrap; }
      .card {
        min-width: 180px;
        border: 1px solid #111;
        border-radius: 12px;
        padding: 10px;
        background: #fff;
      }
      .card-label { font-size: 12px; color: #555; font-weight: 700; }
      .card-value { font-size: 24px; font-weight: 900; margin-top: 4px; }

      .pill-wrap { margin-top: 8px; }
      .pill {
        display: inline-block;
        border: 1px solid #111;
        border-radius: 999px;
        padding: 4px 10px;
        margin-right: 6px;
        margin-bottom: 6px;
        font-size: 12px;
        background: #f8fafc;
        font-weight: 700;
      }

      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
      tr:nth-child(even) td { background: #fafafa; }

      .footer { margin-top: 14px; font-size: 11px; color: #666; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1 class="title">Owner Report</h1>
        <p class="subtitle">LabourLink Platform Operations Summary</p>
        <div class="range">Range: ${escapeHtml(report.dateRange.from)} to ${escapeHtml(report.dateRange.to)}</div>
      </div>
      <div>${logoBlock}</div>
    </div>

    <div class="section">
      <h2 class="section-title">Summary</h2>
      <div class="section-body">
        <div class="cards">
          <div class="card"><div class="card-label">Builders Signed Up</div><div class="card-value">${summary.buildersSignedUp}</div></div>
          <div class="card"><div class="card-label">Labourers Signed Up</div><div class="card-value">${summary.labourersSignedUp}</div></div>
          <div class="card"><div class="card-label">Offers Sent</div><div class="card-value">${summary.offersSent}</div></div>
          <div class="card"><div class="card-label">Payments Created</div><div class="card-value">${summary.paymentsCreated}</div></div>
          <div class="card"><div class="card-label">Total Payment Amount</div><div class="card-value">${money(summary.totalPaymentAmount)}</div></div>
        </div>

        <div class="pill-wrap"><strong>Offers by Status:</strong><br/>${statusBadges(summary.offersByStatus)}</div>
        <div class="pill-wrap"><strong>Payments by Status:</strong><br/>${statusBadges(summary.paymentsByStatus)}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Builders (${report.builders.length})</h2>
      <div class="section-body">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Address</th><th>Created</th></tr></thead>
          <tbody>${buildersRows || `<tr><td colspan="5">No data in selected range.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Labourers (${report.labourers.length})</h2>
      <div class="section-body">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Occupation</th><th>Rate</th><th>Experience</th></tr></thead>
          <tbody>${labourersRows || `<tr><td colspan="5">No data in selected range.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Offers (${report.offers.length})</h2>
      <div class="section-body">
        <table>
          <thead><tr><th>Builder Company</th><th>Builder Email</th><th>Labourer Email</th><th>Date Range</th><th>Status</th></tr></thead>
          <tbody>${offersRows || `<tr><td colspan="5">No data in selected range.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Payments (${report.payments.length})</h2>
      <div class="section-body">
        <table>
          <thead><tr><th>Builder Company</th><th>Builder Email</th><th>Labourer Email</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>${paymentsRows || `<tr><td colspan="6">No data in selected range.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="footer">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
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
      const logoUri = await getReportLogoUri();
      const html = makeReportHtml(report, logoUri);
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
