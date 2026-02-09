import { Asset } from "expo-asset";
import * as Print from "expo-print";
import { apiRequest } from "../api/client";

let cachedLabourLinkLogoUri: string | null | undefined;

export type WorkOfferStatus = "pending" | "declined" | "approved";

export type WorkOffer = {
  id: string;
  builderEmail: string;
  builderCompanyName: string;
  builderLogoUrl?: string;
  labourerEmail: string;
  labourerName: string;
  startDate: string;
  endDate: string;
  hours: number;
  rate: number;
  estimatedHours: number;
  siteAddress: string;
  notes: string;
  status: WorkOfferStatus;
  createdAt: number;
  updatedAt: number;
  labourerSignature?: string;
  labourerRespondedAt?: number;
  pdfContent: string;
  pdfUri?: string;
};

export type CreateWorkOfferInput = {
  builderEmail: string;
  labourerEmail: string;
  startDate: string;
  endDate: string;
  hours: number;
  rate: number;
  estimatedHours: number;
  siteAddress: string;
  notes: string;
};

async function getLabourLinkLogoUri() {
  if (cachedLabourLinkLogoUri !== undefined) return cachedLabourLinkLogoUri;
  try {
    const asset = Asset.fromModule(require("../../assets/icon.png"));
    if (!asset.localUri) await asset.downloadAsync();
    cachedLabourLinkLogoUri = asset.localUri ?? asset.uri ?? null;
  } catch {
    cachedLabourLinkLogoUri = null;
  }
  return cachedLabourLinkLogoUri;
}

function escapeHtml(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makePdfHtml(offer: WorkOffer, logoUri?: string | null) {
  const safeNotes = offer.notes.trim() ? offer.notes : "None";
  const safeSignature = offer.labourerSignature || "Pending";
  const logoImg = logoUri
    ? `<img class="brand-logo" src="${escapeHtml(logoUri)}" alt="LabourLink Logo" />`
    : `<div class="brand-logo-fallback">LL</div>`;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 24px; margin: 0 0 8px 0; }
      .meta { color: #555; margin-bottom: 18px; font-size: 12px; }
      .section { margin-top: 14px; }
      .label { font-weight: 700; margin-top: 6px; }
      .box { border: 1px solid #111; border-radius: 10px; padding: 12px; }
      .status { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #fde047; font-weight: 700; }
      .muted { color: #666; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
      .brand-logo { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; border: 1px solid #111; }
      .brand-logo-fallback {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        border: 1px solid #111;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fde047;
        font-weight: 900;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>LabourLink Work Offer</h1>
      ${logoImg}
    </div>
    <div class="meta">Offer ID: ${escapeHtml(offer.id)} • Created: ${escapeHtml(new Date(offer.createdAt).toLocaleString())}</div>

    <div class="box">
      <div class="label">Builder Company</div>
      <div>${escapeHtml(offer.builderCompanyName)}</div>
      <div class="label">Builder Email</div>
      <div>${escapeHtml(offer.builderEmail)}</div>
    </div>

    <div class="box section">
      <div class="label">Labourer</div>
      <div>${escapeHtml(offer.labourerName)}</div>
      <div class="label">Labourer Email</div>
      <div>${escapeHtml(offer.labourerEmail)}</div>
    </div>

    <div class="box section">
      <div class="label">Date Range</div>
      <div>${escapeHtml(offer.startDate)} to ${escapeHtml(offer.endDate)}</div>
      <div class="label">Hours</div>
      <div>${escapeHtml(String(offer.hours))}</div>
      <div class="label">Rate</div>
      <div>$${escapeHtml(String(offer.rate))}/hr</div>
      <div class="label">Estimated Hours</div>
      <div>${escapeHtml(String(offer.estimatedHours))}</div>
      <div class="label">Site Address</div>
      <div>${escapeHtml(offer.siteAddress)}</div>
      <div class="label">Notes</div>
      <div>${escapeHtml(safeNotes)}</div>
    </div>

    <div class="section">
      <div class="label">Status</div>
      <div class="status">${escapeHtml(offer.status.toUpperCase())}</div>
    </div>

    <div class="section">
      <div class="label">Labourer Signature</div>
      <div>${escapeHtml(safeSignature)}</div>
      ${
        offer.labourerRespondedAt
          ? `<div class="muted">Responded: ${escapeHtml(new Date(offer.labourerRespondedAt).toLocaleString())}</div>`
          : ""
      }
    </div>
  </body>
</html>`;
}

async function makePdfUri(offer: WorkOffer) {
  const logoUri = await getLabourLinkLogoUri();
  const html = makePdfHtml(offer, logoUri);
  const file = await Print.printToFileAsync({ html });
  return file.uri;
}

export async function createWorkOffer(
  input: CreateWorkOfferInput
): Promise<{ ok: true; offer: WorkOffer } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; offer: WorkOffer }>("/offers", {
      method: "POST",
      auth: true,
      body: input,
    });
    return { ok: true, offer: res.offer };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not create offer." };
  }
}

export async function getOffersForBuilder(_builderEmail: string): Promise<WorkOffer[]> {
  try {
    const res = await apiRequest<{ ok: true; offers: WorkOffer[] }>("/offers/builder", {
      auth: true,
    });
    return res.offers;
  } catch {
    return [];
  }
}

export async function getOffersForLabourer(_labourerEmail: string): Promise<WorkOffer[]> {
  try {
    const res = await apiRequest<{ ok: true; offers: WorkOffer[] }>("/offers/labourer", {
      auth: true,
    });
    return res.offers;
  } catch {
    return [];
  }
}

export async function respondToWorkOffer(
  offerId: string,
  _labourerEmail: string,
  status: Extract<WorkOfferStatus, "approved" | "declined">,
  labourerSignature: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true; offer: WorkOffer }>(`/offers/${encodeURIComponent(offerId)}/respond`, {
      method: "POST",
      auth: true,
      body: { status, labourerSignature },
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not respond to offer." };
  }
}

export async function regenerateWorkOfferPdf(
  offerId: string
): Promise<{ ok: true; offer: WorkOffer } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; offer: WorkOffer }>(`/offers/${encodeURIComponent(offerId)}`, {
      auth: true,
    });
    const pdfUri = await makePdfUri(res.offer);
    return { ok: true, offer: { ...res.offer, pdfUri } };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Failed to generate PDF file." };
  }
}
