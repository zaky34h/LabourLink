import { apiRequest } from "../api/client";
import type { LabourerUser } from "../auth/storage";

export async function getSavedLabourers(): Promise<LabourerUser[]> {
  const res = await apiRequest<{ ok: true; labourers: LabourerUser[] }>("/saved-labourers", {
    auth: true,
  });
  return res.labourers || [];
}

export async function isLabourerSaved(labourerEmail: string): Promise<boolean> {
  const res = await apiRequest<{ ok: true; saved: boolean }>(
    `/saved-labourers/${encodeURIComponent(labourerEmail)}/status`,
    { auth: true }
  );
  return Boolean(res.saved);
}

export async function saveLabourer(labourerEmail: string): Promise<void> {
  await apiRequest<{ ok: true; saved: true }>(
    `/saved-labourers/${encodeURIComponent(labourerEmail)}/save`,
    { method: "POST", auth: true }
  );
}

export async function unsaveLabourer(labourerEmail: string): Promise<void> {
  await apiRequest<{ ok: true; saved: false }>(
    `/saved-labourers/${encodeURIComponent(labourerEmail)}/unsave`,
    { method: "POST", auth: true }
  );
}
