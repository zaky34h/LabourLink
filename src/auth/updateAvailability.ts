import { apiRequest } from "../api/client";

export async function updateLabourerAvailability(
  _email: string,
  availableDates: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/labourer/availability", {
      method: "PATCH",
      auth: true,
      body: { availableDates },
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not update availability." };
  }
}
