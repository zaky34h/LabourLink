import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useUnreadMessagesBadge } from "../../src/chat/useUnreadMessagesBadge";

export default function BuilderTabsLayout() {
  const hasUnreadMessages = useUnreadMessagesBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#111",
        tabBarInactiveTintColor: "#444444",
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Browse */}
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />

      {/* Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageTabIcon color={color} size={size} showDot={hasUnreadMessages} />,
        }}
      />

      {/* Offers */}
      <Tabs.Screen
        name="offers"
        options={{
          title: "Offers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="pay"
        options={{
          title: "Pay",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* 🔒 Hidden routes */}
      <Tabs.Screen
        name="subscription"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="saved"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="labourer/[email]"
        options={{ href: null }}
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
