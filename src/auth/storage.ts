import AsyncStorage from "@react-native-async-storage/async-storage";

/* ======================
   Types
====================== */
export type Role = "builder" | "labourer";

export type BuilderUser = {
  role: "builder";
  firstName: string;
  lastName: string;
  companyName: string;
  about: string;
  address: string;
  email: string;
  password: string;
};

export type LabourerUser = {
  role: "labourer";
  firstName: string;
  lastName: string;
  occupation: string;
  about: string;
  pricePerHour: number;
  availableDates: string[]; // ✅ calendar availability (YYYY-MM-DD)
  email: string;
  password: string;
};

export type User = BuilderUser | LabourerUser;

/* ======================
   Storage keys
====================== */
const USERS_KEY = "labourlink_users";
const SESSION_KEY = "labourlink_session_email";

/* ======================
   Users
====================== */
export async function getUsers(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as User[]) : [];
}

export async function saveUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/* ======================
   Register
====================== */
export async function registerUser(
  newUser: User
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await getUsers();
  const exists = users.some(
    (u) => u.email.toLowerCase() === newUser.email.toLowerCase()
  );

  if (exists) return { ok: false, error: "Email already exists" };

  users.push(newUser);
  await saveUsers(users);
  return { ok: true };
}

/* ======================
   Session
====================== */
export async function saveSession(email: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, email);
}

export async function getSessionEmail(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/* ======================
   Login
====================== */
export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const users = await getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) return { ok: false, error: "Account not found" };
  if (user.password !== password) return { ok: false, error: "Incorrect password" };

  await saveSession(user.email);
  return { ok: true, user };
}

/* ======================
   Helpers
====================== */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return (
    users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}