import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_EMAIL_KEY = "labourlink_session_email";
const SESSION_TOKEN_KEY = "labourlink_session_token";
const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 12000);

function stripTrailingSlash(v: string) {
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

function getApiBaseUrls() {
  const configuredList = process.env.EXPO_PUBLIC_API_BASE_URLS;
  if (configuredList && configuredList.trim()) {
    return configuredList
      .split(",")
      .map((x: string) => stripTrailingSlash(x.trim()))
      .filter(Boolean);
  }

  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured && configured.trim()) return [stripTrailingSlash(configured.trim())];

  return ["http://localhost:4000"];
}

export function getApiBaseUrl() {
  return getApiBaseUrls()[0];
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

function formatNetworkError(baseUrl: string, originalError: unknown): Error {
  const message =
    originalError instanceof Error && originalError.message
      ? originalError.message
      : "Network request failed";

  return new Error(
    `Could not reach API at ${baseUrl}. ${message}. Ensure the backend is running (npm run api) and EXPO_PUBLIC_API_BASE_URL points to a reachable host.`
  );
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const baseUrls = getApiBaseUrls();

  if (options.auth) {
    const token = await getSessionToken();
    if (!token) throw new Error("Not logged in.");
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response | null = null;
  let lastNetworkError: unknown = null;
  let lastTriedBaseUrl = baseUrls[0];

  for (const baseUrl of baseUrls) {
    lastTriedBaseUrl = baseUrl;
    try {
      res = await fetchWithTimeout(`${baseUrl}${path}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
      break;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (!res) {
    const attempted = baseUrls.join(", ");
    const baseMessage = formatNetworkError(lastTriedBaseUrl, lastNetworkError).message;
    throw new Error(`${baseMessage} Tried: ${attempted}.`);
  }

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
