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
  unreadCount?: number;
};

export type ChatTypingStatus = {
  meTyping: boolean;
  peerTyping: boolean;
  eitherTyping: boolean;
};

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

export async function getThreadsForUser(_myEmail: string): Promise<ChatThread[]> {
  const res = await apiRequest<{ ok: true; threads: ChatThread[] }>("/chat/threads", {
    auth: true,
  });
  return res.threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
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
