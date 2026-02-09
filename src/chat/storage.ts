import { apiRequest } from "../api/client";

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
};

export async function getMessagesWithPeer(
  _myEmail: string,
  peerEmail: string
): Promise<ChatMessage[]> {
  try {
    const res = await apiRequest<{ ok: true; messages: ChatMessage[] }>(
      `/chat/messages/${encodeURIComponent(peerEmail)}`,
      { auth: true }
    );
    return res.messages.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function getThreadsForUser(_myEmail: string): Promise<ChatThread[]> {
  try {
    const res = await apiRequest<{ ok: true; threads: ChatThread[] }>("/chat/threads", {
      auth: true,
    });
    return res.threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  } catch {
    return [];
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
