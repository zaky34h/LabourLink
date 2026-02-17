import { apiRequest } from "../api/client";

export async function updateLabourerAvailability(
  _email: string,
  unavailableDates: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/labourer/availability", {
      method: "PATCH",
      auth: true,
      body: { unavailableDates },
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not update availability." };
  }
}
