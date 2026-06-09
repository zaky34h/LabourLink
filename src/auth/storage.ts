import {
  apiRequest,
  clearSessionStorage,
  getSessionEmailStorage,
  setSession,
} from "../api/client";

// NOTE: the "builder" role is displayed to users as "Company" (see
// src/roles.ts → ROLE_LABELS). The role string stays "builder" internally.
export type Role = "builder" | "labourer";

export type PendingUser = {
  role: "pending";
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  isDisabled?: boolean;
};

export type BuilderSubscription = {
  planName: string;
  status: "trial" | "active" | "past_due" | "cancelled";
  monthlyPrice: number;
  renewalDate: string | null;
};

export type BuilderReview = {
  id: string;
  labourerEmail: string;
  labourerName: string;
  rating: number;
  comment: string;
  createdAt: number;
};

export type BuilderUser = {
  role: "builder";
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  companyLogoUrl?: string;
  companyRating?: number;
  reviews?: BuilderReview[];
  subscription?: BuilderSubscription;
  email: string;
  password?: string;
  isDisabled?: boolean;
};

export type CertificationDoc = {
  id: string;
  name: string;
  fileUrl: string;
  uploadedAt: number;
  expiryDate?: string;
};

export type LabourerUser = {
  role: "labourer";
  firstName: string;
  lastName: string;
  pricePerHour: number;
  unavailableDates: string[];
  certifications: string[];
  certificationDocs?: CertificationDoc[];
  photoUrl?: string;
  bsb?: string;
  accountNumber?: string;
  subscription?: BuilderSubscription;
  email: string;
  password?: string;
  isDisabled?: boolean;
  // Present (truthy) ONLY for agency-managed labourers — the browse endpoints
  // (/users, /users/:email) set these. Solo labourers never have them.
  agencyManaged?: boolean;
  agencyName?: string;
};

// Managed labourers' login email is a synthetic, non-routable id minted by the
// backend (see makeManagedLabourerEmail). It must never be shown in the UI.
export const MANAGED_LABOURER_EMAIL_SUFFIX = "@managed.labourlink.local";

export function isManagedLabourerEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith(MANAGED_LABOURER_EMAIL_SUFFIX);
}

export type OwnerUser = {
  role: "owner";
  firstName: string;
  lastName: string;
  about: string;
  email: string;
  password?: string;
  isDisabled?: boolean;
};

export type User = PendingUser | BuilderUser | LabourerUser | OwnerUser;

export async function getUsers(): Promise<User[]> {
  const res = await apiRequest<{ ok: true; users: User[] }>("/users", { auth: true });
  return res.users;
}

export async function saveUsers(_users: User[]): Promise<void> {
  throw new Error("saveUsers is no longer supported. Use backend update endpoints.");
}

export async function registerUser(
  newUser: PendingUser | BuilderUser | LabourerUser
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true; user: User }>("/auth/register", {
      method: "POST",
      body: newUser,
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Registration failed." };
  }
}

export async function completeOnboarding(
  payload:
    | ({
        role: "builder";
      } & Pick<BuilderUser, "firstName" | "lastName" | "companyName" | "address">)
    | ({
        role: "labourer";
      } & Pick<
        LabourerUser,
        | "firstName"
        | "lastName"
        | "pricePerHour"
        | "certifications"
        | "bsb"
        | "accountNumber"
      > & { unavailableDates?: string[]; photoUrl?: string })
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; user: User }>("/auth/complete-onboarding", {
      method: "POST",
      auth: true,
      body: payload,
    });
    return { ok: true, user: res.user };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not complete onboarding." };
  }
}

export async function loginWithGoogleIdToken(
  idToken: string
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; token: string; user: User }>("/auth/social/google", {
      method: "POST",
      body: { idToken },
    });
    await setSession(res.token, res.user.email);
    return { ok: true, user: res.user };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Google sign in failed." };
  }
}

export async function loginWithAppleIdentityToken(payload: {
  identityToken: string;
  user: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; token: string; user: User }>("/auth/social/apple", {
      method: "POST",
      body: payload,
    });
    await setSession(res.token, res.user.email);
    return { ok: true, user: res.user };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Apple sign in failed." };
  }
}

export async function saveSession(email: string): Promise<void> {
  // Kept for compatibility; backend login sets real token.
  await setSession("", email);
}

export async function getSessionEmail(): Promise<string | null> {
  return getSessionEmailStorage();
}

export async function clearSession(): Promise<void> {
  try {
    await apiRequest<{ ok: true }>("/auth/logout", { method: "POST", auth: true });
  } catch {
    // no-op: local clear still proceeds
  }
  await clearSessionStorage();
}

export async function deleteAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/auth/delete-account", { method: "POST", auth: true });
    await clearSessionStorage();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not delete account." };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<{ ok: true; token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await setSession(res.token, res.user.email);
    return { ok: true, user: res.user };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Login failed." };
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // The server intentionally returns only { ok: true } (no reset code) and the
    // same response whether or not the email exists. The reset code is delivered
    // out-of-band (email/SMS) — see the TODO in backend POST /auth/forgot-password.
    await apiRequest<{ ok: true }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not request password reset." };
  }
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/auth/reset-password", {
      method: "POST",
      body: { email, code, newPassword },
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not reset password." };
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const res = await apiRequest<{ ok: true; user: User }>(`/users/${encodeURIComponent(email)}`, {
      auth: true,
    });
    return res.user;
  } catch {
    return null;
  }
}
