import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getSessionEmailStorage } from "../api/client";

export type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  createdAt: number;
};

export type ChatThread = {
  threadId: string;
  peerEmail: string;
  lastMessageText: string;
  lastMessageAt: number;
  unreadCount?: number;
};

export type ChatTypingStatus = {
  meTyping: boolean;
  peerTyping: boolean;
  eitherTyping: boolean;
};

const LOCAL_CLOSED_THREADS_KEY = "labourlink_local_closed_threads_v1";

type LocalClosedThreads = Record<string, Record<string, number>>;

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function makeThreadId(a: string, b: string) {
  return [normalizeEmail(a), normalizeEmail(b)].sort().join("__");
}

async function readLocalClosedThreads(): Promise<LocalClosedThreads> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CLOSED_THREADS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LocalClosedThreads;
  } catch {
    return {};
  }
}

async function writeLocalClosedThreads(next: LocalClosedThreads): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_CLOSED_THREADS_KEY, JSON.stringify(next));
  } catch {
    // ignore local cache failures
  }
}

async function markThreadClosedLocally(myEmail: string, peerEmail: string, closedAt: number): Promise<void> {
  const my = normalizeEmail(myEmail);
  const peer = normalizeEmail(peerEmail);
  if (!my || !peer) return;
  const all = await readLocalClosedThreads();
  const mine = { ...(all[my] || {}) };
  mine[peer] = closedAt;
  all[my] = mine;
  await writeLocalClosedThreads(all);
}

async function getLocalClosedThreadsForUser(myEmail: string): Promise<Record<string, number>> {
  const my = normalizeEmail(myEmail);
  if (!my) return {};
  const all = await readLocalClosedThreads();
  return all[my] || {};
}

export async function getMessagesWithPeer(
  _myEmail: string,
  peerEmail: string
): Promise<ChatMessage[]> {
  const res = await apiRequest<{ ok: true; messages: ChatMessage[] }>(
    `/chat/messages/${encodeURIComponent(peerEmail)}`,
    { auth: true }
  );
  return res.messages.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getThreadsForUser(
  _myEmail: string,
  view: "active" | "history" = "active"
): Promise<ChatThread[]> {
  const res = await apiRequest<{ ok: true; threads: ChatThread[] }>(`/chat/threads?view=${view}`, {
    auth: true,
  });
  const myEmail = normalizeEmail(_myEmail);
  const localClosed = await getLocalClosedThreadsForUser(myEmail);
  const list = [...res.threads];

  if (view === "history") {
    for (const [peerEmail, closedAt] of Object.entries(localClosed)) {
      const tid = makeThreadId(myEmail, peerEmail);
      const exists = list.some((t) => t.threadId === tid);
      if (exists) continue;
      list.push({
        threadId: tid,
        peerEmail,
        lastMessageText: "Chat closed",
        lastMessageAt: Number(closedAt || Date.now()),
        unreadCount: 0,
      });
    }
  } else {
    return list
      .filter((t) => {
        const closedAt = Number(localClosed[normalizeEmail(t.peerEmail)] || 0);
        if (!closedAt) return true;
        return Number(t.lastMessageAt || 0) > closedAt;
      })
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  return list.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export async function markThreadRead(peerEmail: string): Promise<void> {
  await apiRequest<{ ok: true }>("/chat/read", {
    method: "POST",
    auth: true,
    body: { peerEmail },
  });
}

export async function closeThread(peerEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/chat/close", {
      method: "POST",
      auth: true,
      body: { peerEmail },
    });
    const myEmail = await getSessionEmailStorage();
    if (myEmail) {
      await markThreadClosedLocally(myEmail, peerEmail, Date.now());
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not close chat." };
  }
}

export async function sendMessage(
  _fromEmail: string,
  toEmail: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Message is empty." };

  try {
    await apiRequest<{ ok: true }>("/chat/messages", {
      method: "POST",
      auth: true,
      body: { toEmail, text: trimmed },
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not send message." };
  }
}

export async function setTypingStatus(
  toEmail: string,
  isTyping: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest<{ ok: true }>("/chat/typing", {
      method: "POST",
      auth: true,
      body: { toEmail, isTyping },
    });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Could not update typing state." };
  }
}

export async function getTypingStatus(peerEmail: string): Promise<ChatTypingStatus> {
  const res = await apiRequest<{ ok: true } & ChatTypingStatus>(
    `/chat/typing/${encodeURIComponent(peerEmail)}`,
    { auth: true }
  );
  return {
    meTyping: Boolean(res.meTyping),
    peerTyping: Boolean(res.peerTyping),
    eitherTyping: Boolean(res.eitherTyping),
  };
}
