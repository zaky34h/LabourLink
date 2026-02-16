import { Asset } from "expo-asset";
import * as Print from "expo-print";
import { apiRequest } from "../api/client";

let cachedLabourLinkLogoUri: string | null | undefined;

export type WorkOfferStatus = "pending" | "declined" | "approved" | "completed";

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
  completedAt?: number;
  labourerCompanyRating?: number;
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
    const asset = Asset.fromModule(require("../../assets/labourlink-logo.png"));
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
  const shiftMatch = safeNotes.match(/Shift:\s*([0-2]?\d:\d{2})\s*-\s*([0-2]?\d:\d{2})/i);
  const hoursDisplay = shiftMatch ? `${shiftMatch[1]} - ${shiftMatch[2]}` : "Not specified";
  const notesWithoutShift = safeNotes
    .replace(/Shift:\s*[0-2]?\d:\d{2}\s*-\s*[0-2]?\d:\d{2}\s*/i, "")
    .trim();
  const displayNotes = notesWithoutShift || "None";
  const signedByLabourer =
    offer.status === "approved" && offer.labourerSignature?.trim()
      ? offer.labourerSignature.trim()
      : "";
  const logoImg = logoUri
    ? `<img class="brand-logo" src="${escapeHtml(logoUri)}" alt="LabourLink Logo" />`
    : `<div class="brand-logo-fallback">LabourLink</div>`;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 34px; margin: 8px 0 4px 0; line-height: 1.1; }
      .section { margin-top: 14px; }
      .label { font-weight: 700; margin-top: 6px; }
      .box { border: 1px solid #111; border-radius: 10px; padding: 12px; }
      .muted { color: #666; }
      .brand-wrap { margin-bottom: 14px; }
      .brand-logo { width: 240px; height: 120px; object-fit: contain; }
      .brand-logo-fallback {
        width: 240px;
        height: 120px;
        border: 1px solid #111;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        background: #fff;
        font-weight: 900;
        padding-left: 12px;
      }
      .signature-box { border: 2px solid #111; border-radius: 10px; padding: 12px; margin-top: 14px; }
      .signature-title { font-weight: 800; font-size: 13px; letter-spacing: 0.3px; }
      .signature-value { margin-top: 8px; font-size: 18px; font-weight: 700; }
      .legal { margin-top: 18px; border: 1px solid #111; border-radius: 10px; padding: 14px; }
      .legal h2 { font-size: 16px; margin: 0 0 8px 0; }
      .legal h3 { font-size: 13px; margin: 12px 0 4px 0; }
      .legal p { margin: 0 0 8px 0; color: #333; font-size: 12px; line-height: 1.5; }
      .legal ul { margin: 0 0 8px 16px; padding: 0; }
      .legal li { color: #333; font-size: 12px; line-height: 1.5; margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <div class="brand-wrap">
      ${logoImg}
      <h1>Work Offer</h1>
    </div>

    <div class="box">
      <div class="label">Date Created</div>
      <div>${escapeHtml(new Date(offer.createdAt).toLocaleDateString())}</div>
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
      <div>${escapeHtml(hoursDisplay)}</div>
      <div class="label">Rate</div>
      <div>$${escapeHtml(String(offer.rate))}/hr</div>
      <div class="label">Estimated Hours</div>
      <div>${escapeHtml(String(offer.estimatedHours))}</div>
      <div class="label">Site Address</div>
      <div>${escapeHtml(offer.siteAddress)}</div>
      <div class="label">Notes</div>
      <div>${escapeHtml(displayNotes)}</div>
    </div>
    ${
      signedByLabourer
        ? `<div class="signature-box">
            <div class="signature-title">Labourer Signature</div>
            <div class="signature-value">${escapeHtml(signedByLabourer)}</div>
          </div>`
        : ""
    }

    <div class="section legal">
      <h2>Terms and Conditions</h2>
      <p>
        By signing this offer, both parties agree to perform and pay for the listed work in good faith,
        follow all applicable workplace safety laws, and resolve disputes professionally before escalation.
        Any agreed scope, timing, or rate changes should be recorded in writing.
      </p>
      <h2>Privacy Policy</h2>
      <p><strong>Effective Date:</strong> 16 February 2026</p>
      <p>
        LabourLink ("we", "our", or "us") operates the LabourLink mobile application (the "App").
      </p>
      <p>
        This Privacy Policy explains how we collect, use, and protect your information when you use our App.
      </p>
      <h3>1. Information We Collect</h3>
      <p>We may collect the following types of information:</p>
      <p><strong>a) Account Information</strong></p>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Profile details (skills, availability, location area)</li>
      </ul>
      <p><strong>b) Usage Information</strong></p>
      <ul>
        <li>App activity</li>
        <li>Job postings</li>
        <li>Messages sent within the app</li>
        <li>Device type and operating system</li>
      </ul>
      <p><strong>c) Payment Information</strong></p>
      <p>
        If payments are processed in the future, payment data will be securely handled by third-party payment providers.
        LabourLink does not store full payment card details.
      </p>
      <h3>2. How We Use Your Information</h3>
      <p>We use your information to:</p>
      <ul>
        <li>Create and manage your account</li>
        <li>Match builders with labourers</li>
        <li>Enable messaging and job scheduling</li>
        <li>Improve app performance and user experience</li>
        <li>Provide customer support</li>
        <li>Prevent fraud and misuse</li>
      </ul>
      <h3>3. Data Storage &amp; Security</h3>
      <p>We take reasonable measures to protect your information.</p>
      <p>
        Data is stored securely on protected servers and access is limited to authorized personnel.
      </p>
      <p>However, no method of electronic transmission is 100% secure.</p>
      <h3>4. Sharing of Information</h3>
      <p>We do not sell your personal information.</p>
      <p>We may share information:</p>
      <ul>
        <li>Between builders and labourers to enable job matching</li>
        <li>With service providers who help operate the app</li>
        <li>If required by law</li>
      </ul>
      <h3>5. Your Rights</h3>
      <p>You may:</p>
      <ul>
        <li>Update your profile information within the app</li>
        <li>Request deletion of your account</li>
        <li>Contact us regarding your personal data</li>
      </ul>
      <p>To request account deletion, contact: linkgroupapps@gmail.com</p>
      <h3>6. Third-Party Services</h3>
      <p>
        The app may use third-party services such as hosting providers and analytics tools.
        These providers have their own privacy policies.
      </p>
      <h3>7. Changes to This Policy</h3>
      <p>
        We may update this Privacy Policy from time to time.
        Updates will be posted within the app or on our website.
      </p>
      <h3>8. Contact Us</h3>
      <p>If you have questions about this Privacy Policy, contact:</p>
      <p>Email: linkgroupapps@gmail.com</p>
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

export async function completeWorkOffer(
  offerId: string,
  rating: number
): Promise<{ ok: true; offer: WorkOffer } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; offer: WorkOffer }>(
      `/offers/${encodeURIComponent(offerId)}/complete`,
      {
        method: "POST",
        auth: true,
        body: { rating },
      }
    );
    return { ok: true, offer: res.offer };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not complete work." };
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
