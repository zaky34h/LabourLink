import { apiRequest } from "../api/client";
import { type BuilderUser } from "./storage";

export async function updateBuilderProfile(
  _email: string,
  patch: Partial<
    Pick<
      BuilderUser,
      "firstName" | "lastName" | "companyName" | "about" | "address" | "companyLogoUrl"
    >
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/builder/profile", {
      method: "PATCH",
      auth: true,
      body: patch,
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not update builder profile." };
  }
}
