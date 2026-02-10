import { Asset } from "expo-asset";
import * as Print from "expo-print";
import { apiRequest } from "../api/client";

let cachedLogoUri: string | null | undefined;

export type PaymentStatus = "pending" | "paid";

export type PaymentRecord = {
  id: string;
  offerId: string;
  builderEmail: string;
  labourerEmail: string;
  builderCompanyName: string;
  labourerName: string;
  labourerBsb: string;
  labourerAccountNumber: string;
  amountOwed: number;
  details: string;
  status: PaymentStatus;
  receiptContent?: string;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
};

async function getLogoUri() {
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

function escapeHtml(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeReceiptHtml(payment: PaymentRecord, logoUri?: string | null) {
  const logo = logoUri
    ? `<img src="${escapeHtml(logoUri)}" style="width:220px;height:100px;object-fit:contain" />`
    : `<div style="font-weight:900;">LabourLink</div>`;

  const content = payment.receiptContent || "";
  const lines = content.split("\n").filter(Boolean);
  const rendered = lines.map((line) => `<div style="margin-bottom:6px;">${escapeHtml(line)}</div>`).join("");

  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial; padding: 24px; color: #111;">
    <div style="margin-bottom: 12px;">${logo}</div>
    <h1 style="font-size: 30px; margin: 0 0 10px 0;">Payment Receipt</h1>
    <div style="border: 1px solid #111; border-radius: 10px; padding: 14px;">
      ${rendered}
    </div>
  </body>
</html>`;
}

export async function getBuilderPayments(): Promise<PaymentRecord[]> {
  const res = await apiRequest<{ ok: true; payments: PaymentRecord[] }>("/payments/builder", { auth: true });
  return res.payments;
}

export async function getLabourerPayments(): Promise<PaymentRecord[]> {
  const res = await apiRequest<{ ok: true; payments: PaymentRecord[] }>("/payments/labourer", { auth: true });
  return res.payments;
}

export async function updatePayment(
  paymentId: string,
  patch: { amountOwed: number; details: string }
): Promise<{ ok: true; payment: PaymentRecord } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; payment: PaymentRecord }>(`/payments/${encodeURIComponent(paymentId)}`, {
      method: "PATCH",
      auth: true,
      body: patch,
    });
    return { ok: true, payment: res.payment };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not update payment." };
  }
}

export async function markPaymentPaid(
  paymentId: string
): Promise<{ ok: true; payment: PaymentRecord } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; payment: PaymentRecord }>(
      `/payments/${encodeURIComponent(paymentId)}/pay`,
      { method: "POST", auth: true }
    );
    return { ok: true, payment: res.payment };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not mark as paid." };
  }
}

export async function generateReceiptPdf(
  payment: PaymentRecord
): Promise<{ ok: true; uri: string } | { ok: false; error: string }> {
  try {
    const logoUri = await getLogoUri();
    const html = makeReceiptHtml(payment, logoUri);
    const file = await Print.printToFileAsync({ html });
    return { ok: true, uri: file.uri };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not generate receipt PDF." };
  }
}
