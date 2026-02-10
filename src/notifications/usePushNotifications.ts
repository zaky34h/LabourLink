import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useCurrentUser } from "../auth/useCurrentUser";
import { registerPushToken } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function getProjectId() {
  const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (easProjectId) return easProjectId;
  const fallbackProjectId = (Constants as any)?.easConfig?.projectId;
  return fallbackProjectId || undefined;
}

async function getExpoPushToken() {
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FDE047",
    });
  }

  const projectId = await getProjectId();
  const tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return tokenRes.data;
}

export function usePushNotifications() {
  const { user } = useCurrentUser();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function register() {
      if (!user?.email) return;
      try {
        const token = await getExpoPushToken();
        if (!mounted || !token) return;
        if (registeredRef.current === token) return;
        await registerPushToken(token);
        registeredRef.current = token;
      } catch {
        // Ignore permission/network issues; app continues to function.
      }
    }

    register();
    return () => {
      mounted = false;
    };
  }, [user?.email]);
}
