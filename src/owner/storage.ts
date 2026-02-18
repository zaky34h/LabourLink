import { apiRequest } from "../api/client";
import type { BuilderUser, LabourerUser } from "../auth/storage";

export type OwnerOverview = {
  buildersSignedUp: number;
  labourersSignedUp: number;
  workOffersSent: number;
  totalUsers: number;
};

export async function getOwnerOverview(): Promise<OwnerOverview> {
  const res = await apiRequest<{ ok: true; overview: OwnerOverview }>("/owner/overview", {
    auth: true,
  });
  return res.overview;
}

export async function getOwnerBuilders(): Promise<BuilderUser[]> {
  const res = await apiRequest<{ ok: true; builders: BuilderUser[] }>("/owner/builders", {
    auth: true,
  });
  return res.builders;
}

export async function getOwnerLabourers(): Promise<LabourerUser[]> {
  const res = await apiRequest<{ ok: true; labourers: LabourerUser[] }>("/owner/labourers", {
    auth: true,
  });
  return res.labourers;
}

export type OwnerReport = {
  dateRange: { from: string; to: string };
  summary: {
    buildersSignedUp: number;
    labourersSignedUp: number;
    offersSent: number;
    paymentsCreated: number;
    totalPaymentAmount: number;
    offersByStatus: Record<string, number>;
    paymentsByStatus: Record<string, number>;
  };
  builders: Array<{
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    about: string;
    address: string;
    createdAt: number;
  }>;
  labourers: Array<{
    firstName: string;
    lastName: string;
    email: string;
    occupation: string;
    about: string;
    pricePerHour: number;
    experienceYears: number;
    createdAt: number;
  }>;
  offers: Array<{
    builderEmail: string;
    builderCompanyName: string;
    labourerEmail: string;
    labourerName: string;
    startDate: string;
    endDate: string;
    hours: number;
    rate: number;
    estimatedHours: number;
    siteAddress: string;
    status: string;
    createdAt: number;
  }>;
  payments: Array<{
    builderEmail: string;
    labourerEmail: string;
    builderCompanyName: string;
    labourerName: string;
    amountOwed: number;
    status: string;
    createdAt: number;
    paidAt: number | null;
  }>;
};

export async function getOwnerReport(from: string, to: string): Promise<OwnerReport> {
  const res = await apiRequest<{ ok: true; report: OwnerReport }>(
    `/owner/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    {
      auth: true,
    }
  );
  return res.report;
}

export type SupportUser = {
  email: string;
  role: "builder" | "labourer" | "owner";
  firstName: string;
  lastName: string;
  companyName: string;
  occupation: string;
  isDisabled: boolean;
  createdAt: number;
};

export async function searchSupportUsers(query: string): Promise<SupportUser[]> {
  const res = await apiRequest<{ ok: true; users: SupportUser[] }>(
    `/owner/support/users?query=${encodeURIComponent(query)}`,
    { auth: true }
  );
  return res.users;
}

export async function disableSupportUser(email: string): Promise<void> {
  await apiRequest<{ ok: true }>(
    `/owner/support/users/${encodeURIComponent(email)}/disable`,
    { method: "POST", auth: true }
  );
}

export async function enableSupportUser(email: string): Promise<void> {
  await apiRequest<{ ok: true }>(
    `/owner/support/users/${encodeURIComponent(email)}/enable`,
    { method: "POST", auth: true }
  );
}

export async function forceLogoutSupportUser(email: string): Promise<void> {
  await apiRequest<{ ok: true }>(
    `/owner/support/users/${encodeURIComponent(email)}/force-logout`,
    { method: "POST", auth: true }
  );
}

export async function resetSupportUserPassword(email: string): Promise<string> {
  const res = await apiRequest<{ ok: true; temporaryPassword: string }>(
    `/owner/support/users/${encodeURIComponent(email)}/reset-password`,
    { method: "POST", auth: true }
  );
  return res.temporaryPassword;
}
