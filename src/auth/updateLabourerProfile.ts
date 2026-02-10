import { apiRequest } from "../api/client";
import { type LabourerUser } from "./storage";

export async function updateLabourerProfile(
  _email: string,
  patch: Partial<
    Pick<
      LabourerUser,
      "photoUrl" | "firstName" | "lastName" | "occupation" | "about" | "pricePerHour" | "experienceYears" | "certifications" | "bsb" | "accountNumber"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/labourer/profile", {
      method: "PATCH",
      auth: true,
      body: patch,
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not update labourer profile." };
  }
}
