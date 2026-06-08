import { Stack } from "expo-router";
import { usePushNotifications } from "../src/notifications/usePushNotifications";
import { colors } from "../src/theme";

export default function RootLayout() {
  usePushNotifications();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
