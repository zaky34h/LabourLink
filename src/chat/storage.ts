import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserByEmail } from "../auth/storage";

const MESSAGES_KEY = "labourlink_messages_v1";

export type ChatMessage = {
  id: string;
  from: string; // email
  to: string;   // email
  text: string;
  createdAt: number; // epoch ms
};

export type ChatThread = {
  threadId: string;
  peerEmail: string;
  lastMessageText: string;
  lastMessageAt: number;
};

function makeThreadId(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return [x, y].sort().join("__");
}

async function getAllMessages(): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(MESSAGES_KEY);
  return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
}

async function saveAllMessages(msgs: ChatMessage[]) {
  await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
}

export async function getMessagesWithPeer(
  myEmail: string,
  peerEmail: string
): Promise<ChatMessage[]> {
  const all = await getAllMessages();
  const threadId = makeThreadId(myEmail, peerEmail);
  return all
    .filter((m) => makeThreadId(m.from, m.to) === threadId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getThreadsForUser(myEmail: string): Promise<ChatThread[]> {
  const all = await getAllMessages();

  // collect latest message per thread
  const map = new Map<string, ChatMessage>();
  for (const m of all) {
    if (
      m.from.toLowerCase() !== myEmail.toLowerCase() &&
      m.to.toLowerCase() !== myEmail.toLowerCase()
    ) continue;

    const tid = makeThreadId(m.from, m.to);
    const existing = map.get(tid);
    if (!existing || m.createdAt > existing.createdAt) map.set(tid, m);
  }

  const threads: ChatThread[] = [];
  for (const [threadId, last] of map.entries()) {
    const peerEmail =
      last.from.toLowerCase() === myEmail.toLowerCase() ? last.to : last.from;

    threads.push({
      threadId,
      peerEmail,
      lastMessageText: last.text,
      lastMessageAt: last.createdAt,
    });
  }

  // newest first
  threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  return threads;
}

/**
 * Enforces: builder <-> labourer only (no builder<->builder, no labourer<->labourer)
 */
export async function sendMessage(
  fromEmail: string,
  toEmail: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Message is empty." };

  const fromUser = await getUserByEmail(fromEmail);
  const toUser = await getUserByEmail(toEmail);

  if (!fromUser) return { ok: false, error: "Sender not found." };
  if (!toUser) return { ok: false, error: "Recipient not found." };

  if (fromUser.role === toUser.role) {
    return { ok: false, error: "Builders can only chat with labourers (and vice versa)." };
  }

  const newMsg: ChatMessage = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    from: fromEmail,
    to: toEmail,
    text: trimmed,
    createdAt: Date.now(),
  };

  const all = await getAllMessages();
  all.push(newMsg);
  await saveAllMessages(all);

  return { ok: true };
}