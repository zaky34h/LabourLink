import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { getNotifications, markNotificationRead } from "./storage";

export function useNotificationPolling() {
  const highWatermarkRef = useRef<number>(Date.now());
  const runningRef = useRef(false);

  useEffect(() => {
    async function poll() {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const notifications = await getNotifications();
        if (notifications.length > 0) {
          const sortedAsc = [...notifications].sort((a, b) => a.createdAt - b.createdAt);
          const fresh = sortedAsc.filter((n) => n.createdAt > highWatermarkRef.current);

          for (const n of fresh) {
            Alert.alert(n.title, n.body);
            if (!n.isRead) {
              markNotificationRead(n.id).catch(() => {});
            }
          }

          const latestCreatedAt = sortedAsc[sortedAsc.length - 1].createdAt;
          if (latestCreatedAt > highWatermarkRef.current) {
            highWatermarkRef.current = latestCreatedAt;
          }
        }
      } catch {
        // Ignore transient network/auth errors; polling resumes automatically.
      } finally {
        runningRef.current = false;
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      clearInterval(interval);
    };
  }, []);
}
