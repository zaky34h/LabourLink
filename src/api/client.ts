import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_EMAIL_KEY = "labourlink_session_email";
const SESSION_TOKEN_KEY = "labourlink_session_token";

function stripTrailingSlash(v: string) {
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured && configured.trim()) return stripTrailingSlash(configured.trim());
  return "http://localhost:4000";
}

export async function getSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
}

export async function setSession(token: string, email: string): Promise<void> {
  await AsyncStorage.multiSet([
    [SESSION_TOKEN_KEY, token],
    [SESSION_EMAIL_KEY, email],
  ]);
}

export async function clearSessionStorage(): Promise<void> {
  await AsyncStorage.multiRemove([SESSION_TOKEN_KEY, SESSION_EMAIL_KEY]);
}

export async function getSessionEmailStorage(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_EMAIL_KEY);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.auth) {
    const token = await getSessionToken();
    if (!token) throw new Error("Not logged in.");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: any = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }

  return payload as T;
}

