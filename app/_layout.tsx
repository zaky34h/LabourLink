import { Stack } from "expo-router";
import { usePushNotifications } from "../src/notifications/usePushNotifications";

export default function RootLayout() {
  usePushNotifications();
  return <Stack screenOptions={{ headerShown: false }} />;
}
