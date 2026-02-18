import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useUnreadMessagesBadge } from "../../src/chat/useUnreadMessagesBadge";

export default function LabourerTabsLayout() {
  const hasUnreadMessages = useUnreadMessagesBadge();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#111",
        tabBarInactiveTintColor: "#444444",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageTabIcon color={color} size={size} showDot={hasUnreadMessages} />,
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: "Offers",
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: "Pay",
          tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

function MessageTabIcon({
  color,
  size,
  showDot,
}: {
  color: string;
  size: number;
  showDot: boolean;
}) {
  return (
    <View style={{ width: size + 10, height: size + 10, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="chatbubble" size={size} color={color} />
      {showDot ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 1,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#DC2626",
          }}
        />
      ) : null}
    </View>
  );
}
