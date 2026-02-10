import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useCurrentUser } from "../auth/useCurrentUser";
import { getThreadsForUser } from "./storage";

export function useUnreadMessagesBadge() {
  const { user } = useCurrentUser();
  const [hasUnread, setHasUnread] = useState(false);

  const load = useCallback(async () => {
    if (!user?.email) {
      setHasUnread(false);
      return;
    }
    try {
      const threads = await getThreadsForUser(user.email);
      setHasUnread(threads.some((t) => Number(t.unreadCount || 0) > 0));
    } catch {
      setHasUnread(false);
    }
  }, [user?.email]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  return hasUnread;
}
