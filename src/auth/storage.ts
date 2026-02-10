import {
  apiRequest,
  clearSessionStorage,
  getSessionEmailStorage,
  setSession,
} from "../api/client";

export type Role = "builder" | "labourer";

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
  about: string;
  address: string;
  companyLogoUrl?: string;
  companyRating?: number;
  reviews?: BuilderReview[];
  subscription?: BuilderSubscription;
  email: string;
  password?: string;
};

export type LabourerUser = {
  role: "labourer";
  firstName: string;
  lastName: string;
  occupation: string;
  about: string;
  pricePerHour: number;
  availableDates: string[];
  certifications: string[];
  experienceYears: number;
  photoUrl?: string;
  bsb?: string;
  accountNumber?: string;
  subscription?: BuilderSubscription;
  email: string;
  password?: string;
};

export type User = BuilderUser | LabourerUser;

export async function getUsers(): Promise<User[]> {
  const res = await apiRequest<{ ok: true; users: User[] }>("/users", { auth: true });
  return res.users;
}

export async function saveUsers(_users: User[]): Promise<void> {
  throw new Error("saveUsers is no longer supported. Use backend update endpoints.");
}

export async function registerUser(
  newUser: User
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
