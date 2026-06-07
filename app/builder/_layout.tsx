import { Tabs } from "expo-router";
import { useUnreadMessagesBadge } from "../../src/chat/useUnreadMessagesBadge";
import { TabBarIcon } from "../../src/ui/TabBarIcon";
import { colors, fontFamily, fontWeight } from "../../src/theme";

export default function BuilderTabsLayout() {
  const hasUnreadMessages = useUnreadMessagesBadge();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily,
          fontWeight: fontWeight.bold,
          fontSize: 11,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />

      {/* Browse */}
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ focused }) => <TabBarIcon name="list" focused={focused} />,
        }}
      />

      {/* Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="chatbubble" focused={focused} showDot={hasUnreadMessages} />
          ),
        }}
      />

      {/* Offers */}
      <Tabs.Screen
        name="offers"
        options={{
          title: "Offers",
          tabBarIcon: ({ focused }) => <TabBarIcon name="document-text" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="pay"
        options={{
          title: "Pay",
          tabBarIcon: ({ focused }) => <TabBarIcon name="card" focused={focused} />,
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabBarIcon name="person" focused={focused} />,
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
