import { apiRequest } from "../api/client";

export type AppNotification = {
  id: string;
  recipientEmail: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: number;
};

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await apiRequest<{ ok: true; notifications: AppNotification[] }>("/notifications", {
    auth: true,
  });
  return res.notifications;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiRequest<{ ok: true }>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
    auth: true,
  });
}

export async function registerPushToken(token: string): Promise<void> {
  await apiRequest<{ ok: true }>("/push/register", {
    method: "POST",
    auth: true,
    body: { token },
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiRequest<{ ok: true }>("/push/unregister", {
    method: "POST",
    auth: true,
    body: { token },
  });
}
